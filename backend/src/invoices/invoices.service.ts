import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private pdf: InvoicePdfService,
  ) {}

  /**
   * "Generate Invoice" step, run right after a delivery is confirmed.
   * Total is computed from the order's line items and snapshotted onto
   * the invoice so later price changes never affect issued invoices.
   *
   * Also renders a PDF and uploads it to MinIO in the same call — if that
   * part fails (e.g. MinIO isn't reachable), the invoice record itself
   * still gets created/updated so the workflow isn't blocked; the PDF can
   * be regenerated later via `regeneratePdf`.
   */
  async generate(workspaceId: string | undefined, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...(workspaceId ? { workspaceId } : {}) },
      include: { items: { include: { product: true } }, customer: true, agent: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const wsId = workspaceId || order.workspaceId;

    const total = order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

    const invoice = await this.prisma.invoice.upsert({
      where: { orderId },
      create: { workspaceId: wsId, orderId, customerId: order.customerId, total, paymentStatus: 'UNPAID' },
      update: { total },
    });

    try {
      await this.regeneratePdf(wsId, invoice.id);
    } catch (err) {
      this.logger.warn(`Invoice ${invoice.id} created without a PDF (storage unavailable): ${(err as Error).message}`);
    }

    return this.findOne(wsId, invoice.id);
  }

  /** Re-renders the PDF for an existing invoice and re-uploads it to MinIO. */
  async regeneratePdf(workspaceId: string, id: string) {
    const workspace = await this.prisma.organization.findUnique({ where: { id: workspaceId } });
    const invoice = await this.findOne(workspaceId, id);

    const currency = JSON.parse(workspace?.metadata || '{}').currency || 'ETB';
    const buffer = await this.pdf.render({
      invoiceId: invoice.id,
      workspaceName: workspace?.name || 'Simuni',
      currency,
      customerName: invoice.customer.name,
      customerAddress: invoice.customer.address,
      agentName: invoice.order.agent?.name ?? 'Self-service order',
      createdAt: invoice.createdAt,
      paymentStatus: invoice.paymentStatus,
      items: invoice.order.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.price),
      })),
      total: Number(invoice.total),
    });

    const objectKey = `invoices/${workspaceId}/${invoice.id}.pdf`;
    const { url } = await this.storage.uploadBuffer(objectKey, buffer, 'application/pdf');

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: url, pdfObjectKey: objectKey },
    });
  }

  findAll(workspaceId: string) {
    return this.prisma.invoice.findMany({
      where: { workspaceId },
      include: { customer: true, order: { include: { agent: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, workspaceId },
      include: { customer: true, order: { include: { items: { include: { product: true } }, agent: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /** "Collect Payment" — mark unpaid/partial/paid as cash or mobile money comes in. */
  async setPaymentStatus(workspaceId: string, id: string, paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID') {
    await this.findOne(workspaceId, id);
    return this.prisma.invoice.update({ where: { id }, data: { paymentStatus } });
  }

  /**
   * Refreshes the signed download URL for an invoice's PDF (MinIO signed
   * URLs expire — call this instead of trusting a long-cached pdfUrl).
   */
  async refreshPdfUrl(workspaceId: string, id: string) {
    const invoice = await this.findOne(workspaceId, id);
    if (!invoice.pdfObjectKey) throw new NotFoundException('No PDF has been generated for this invoice yet');
    const url = await this.storage.getSignedUrl(invoice.pdfObjectKey);
    return this.prisma.invoice.update({ where: { id }, data: { pdfUrl: url } });
  }
}
