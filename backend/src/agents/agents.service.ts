import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  /** All field agents in the workspace, with their live status and vehicle info. */
  async findAll(workspaceId: string) {
    const members = await this.prisma.member.findMany({
      where: { organizationId: workspaceId, role: 'member' },
      include: { user: { include: { agentProfile: true } } },
    });
    return members.map((m) => m.user);
  }

  async updateVehicle(workspaceId: string, userId: string, vehicle: string) {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId: workspaceId, userId } },
    });
    if (!member || member.role !== 'member') throw new NotFoundException('Agent not found');
    return this.prisma.agentProfile.update({ where: { userId }, data: { vehicle } });
  }

  /** Snapshot used for the "Track agents" dashboard: last known location + active route. */
  async liveStatus(workspaceId: string) {
    const members = await this.prisma.member.findMany({
      where: { organizationId: workspaceId, role: 'member' },
      include: {
        user: {
          include: {
            agentProfile: true,
            routesManaged: { where: { workspaceId, status: 'IN_PROGRESS' }, take: 1 },
          },
        },
      },
    });
    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      isOnline: m.user.agentProfile?.isOnline ?? false,
      lastLat: m.user.agentProfile?.lastLat,
      lastLng: m.user.agentProfile?.lastLng,
      activeRoute: (m.user as any).routesManaged?.[0] ?? null,
    }));
  }
}
