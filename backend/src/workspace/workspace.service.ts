import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

function parseMetadata(metadata: string | null): { currency?: string } {
  if (!metadata) return {};
  try { return JSON.parse(metadata); } catch { return {}; }
}

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) return null;
    return { id: org.id, name: org.name, slug: org.slug, currency: parseMetadata(org.metadata).currency ?? 'ETB' };
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });
    const metadata = { ...parseMetadata(existing?.metadata ?? null), ...(dto.currency ? { currency: dto.currency } : {}) };
    const org = await this.prisma.organization.update({
      where: { id },
      data: { ...(dto.name ? { name: dto.name } : {}), metadata: JSON.stringify(metadata) },
    });
    return this.findOne(org.id);
  }

  /** Daily performance summary for the "Monitor daily performance" success criterion. */
  async dashboard(id: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeAgents, ordersToday, deliveredToday, invoicesToday, unpaidTotal] = await Promise.all([
      this.prisma.member.count({ where: { organizationId: id, role: 'member', user: { banned: false } } }),
      this.prisma.order.count({ where: { workspaceId: id, createdAt: { gte: today } } }),
      this.prisma.delivery.count({
        where: { order: { workspaceId: id }, status: 'DELIVERED', confirmedAt: { gte: today } },
      }),
      this.prisma.invoice.count({ where: { workspaceId: id, createdAt: { gte: today } } }),
      this.prisma.invoice.aggregate({
        where: { workspaceId: id, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        _sum: { total: true },
      }),
    ]);

    return {
      activeAgents,
      ordersToday,
      deliveredToday,
      invoicesToday,
      outstandingBalance: unpaidTotal._sum.total ?? 0,
    };
  }
}
