import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { auth } from '../auth/better-auth.instance';
import { toOrgRole } from '../auth/roles';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Business Owner / Manager inviting a Manager or Field Agent into the
   * workspace. Creates the Better Auth credential (same primitive as
   * workspace registration) plus a Member row scoping them to this
   * workspace with the requested role.
   */
  async create(workspaceId: string, dto: CreateUserDto) {
    const email = dto.email || `${dto.phone}@users.simuni.app`;

    const signUpResult = await auth.api.signUpEmail({
      body: { email, password: dto.password, name: dto.name, username: dto.phone } as any,
    });
    const userId = (signUpResult as any).user.id;

    await this.prisma.member.create({
      data: { organizationId: workspaceId, userId, role: toOrgRole(dto.role as any) },
    });

    if (dto.role === 'AGENT') {
      await this.prisma.agentProfile.create({ data: { userId } });
    }

    return this.findOne(workspaceId, userId);
  }

  async findAll(workspaceId: string) {
    const members = await this.prisma.member.findMany({
      where: { organizationId: workspaceId },
      include: { user: { include: { agentProfile: true } } },
    });
    return members.map((m) => ({ ...m.user, orgRole: m.role }));
  }

  async findOne(workspaceId: string, userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId: workspaceId, userId } },
      include: { user: { include: { agentProfile: true } } },
    });
    if (!member) throw new NotFoundException('User not found in this workspace');
    return { ...member.user, orgRole: member.role };
  }

  /** Suspends a teammate's access without deleting their history. */
  async remove(workspaceId: string, userId: string) {
    await this.findOne(workspaceId, userId);
    await auth.api.banUser({ body: { userId, banReason: 'Suspended by workspace owner' } as any });
    return { success: true };
  }
}
