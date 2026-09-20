import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { TelebirrService } from './telebirr.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private telebirr: TelebirrService,
    private invoicesService: InvoicesService,
  ) {}

  /**
   * "Collect Payment" via telebirr — creates a Payment (transaction) row
   * PENDING, asks Telebirr for a checkout, and returns the URL the client
   * should open (browser tab, WebView, or `Linking.openURL` on mobile —
   * telebirr's H5 flow auto-hands off to the native app if it's installed).
   */
  async startCheckout(workspaceId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: { customer: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const outTradeNo = `SIMUNI-${invoice.id}-${Date.now().toString(36)}`.toUpperCase();

    const payment = await this.prisma.payment.create({
      data: {
        workspaceId,
        invoiceId,
        provider: 'TELEBIRR',
        outTradeNo,
        amount: invoice.total,
        status: 'PENDING',
      },
    });

    try {
      const result = await this.telebirr.createCheckout({
        amount: Number(invoice.total),
        currency: 'ETB',
        purpose: 'Payment',
        reference: outTradeNo,
        subject: `Simuni invoice for ${invoice.customer.name}`,
        notifyUrl: process.env.TELEBIRR_NOTIFY_URL || '',
        returnUrl: process.env.TELEBIRR_RETURN_URL || '',
      });
      return { paymentId: payment.id, outTradeNo, checkoutUrl: result.checkoutUrl || result.receiveCode };
    } catch (err) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw err;
    }
  }

  /**
   * Called from the public webhook endpoint once Telebirr's signature has
   * been verified. Idempotent — Telebirr may retry the notify call, and a
   * customer might also land on the return URL for the same transaction.
   */
  async handleConfirmedPayment(outTradeNo: string, providerTradeNo: string | undefined, rawPayload: string) {
    const payment = await this.prisma.payment.findUnique({ where: { outTradeNo } });
    if (!payment) {
      this.logger.warn(`Telebirr notify for unknown outTradeNo "${outTradeNo}" — ignoring`);
      return;
    }
    if (payment.status === 'SUCCESS') return; // already processed, avoid double-marking the invoice PAID

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', providerTradeNo, rawNotifyPayload: rawPayload },
    });

    await this.invoicesService.setPaymentStatus(payment.workspaceId, payment.invoiceId, 'PAID');
  }

  async markFailed(outTradeNo: string, rawPayload: string) {
    const payment = await this.prisma.payment.findUnique({ where: { outTradeNo } });
    if (!payment || payment.status === 'SUCCESS') return;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', rawNotifyPayload: rawPayload },
    });
  }

  async findForInvoice(workspaceId: string, invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { workspaceId, invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
