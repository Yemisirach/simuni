import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { auth } from '../auth/better-auth.instance';
import { toOrgRole } from '../auth/roles';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    const cleanPhone = (dto.phone || '').replace(/[\s\-\+\(\)]/g, '');
    if (cleanPhone.length < 6) {
      throw new BadRequestException('Phone number must have at least 6 digits.');
    }
    const email = dto.email || `${cleanPhone}@users.simuni.app`;

    let userId: string;
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: cleanPhone },
          { phoneNumber: cleanPhone },
          { username: dto.phone },
          { phoneNumber: dto.phone },
        ],
      },
    });

    if (existingUser) {
      userId = existingUser.id;
      const existingMember = await this.prisma.member.findUnique({
        where: { organizationId_userId: { organizationId: workspaceId, userId } },
      });
      if (existingMember) {
        throw new ConflictException(`A user with phone number ${dto.phone} already belongs to this workspace.`);
      }
      await this.prisma.member.create({
        data: { organizationId: workspaceId, userId, role: toOrgRole(dto.role as any) },
      });
    } else {
      const signUpResult = await auth.api.signUpEmail({
        body: { email, password: dto.password, name: dto.name, username: cleanPhone } as any,
      });
      userId = (signUpResult as any).user.id;

      await this.prisma.member.create({
        data: { organizationId: workspaceId, userId, role: toOrgRole(dto.role as any) },
      });
    }

    // Ensure phoneNumber and username are set to clean digits for phone login
    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: cleanPhone, username: cleanPhone, name: dto.name },
    });

    if (dto.role === 'AGENT' || dto.vehicle) {
      const existingProfile = await this.prisma.agentProfile.findUnique({ where: { userId } });
      if (!existingProfile) {
        await this.prisma.agentProfile.create({
          data: { userId, vehicle: dto.vehicle || null },
        });
      } else if (dto.vehicle) {
        await this.prisma.agentProfile.update({
          where: { userId },
          data: { vehicle: dto.vehicle },
        });
      }
    }

    return this.findOne(workspaceId, userId);
  }

  async findAll(workspaceId: string) {
    const members = await this.prisma.member.findMany({
      where: { organizationId: workspaceId },
      include: { user: { include: { agentProfile: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return members.map((m) => ({
      ...m.user,
      phone: m.user.phoneNumber || m.user.username || '',
      orgRole: m.role,
      vehicle: m.user.agentProfile?.vehicle || null,
      isOnline: m.user.agentProfile?.isOnline || false,
    }));
  }

  async findOne(workspaceId: string, userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId: workspaceId, userId } },
      include: { user: { include: { agentProfile: true } } },
    });
    if (!member) throw new NotFoundException('User not found in this workspace');
    return {
      ...member.user,
      phone: member.user.phoneNumber || member.user.username || '',
      orgRole: member.role,
      vehicle: member.user.agentProfile?.vehicle || null,
      isOnline: member.user.agentProfile?.isOnline || false,
    };
  }

  /**
   * Updates teammate profile, role, phone/username or vehicle assignment.
   */
  async update(workspaceId: string, userId: string, dto: UpdateUserDto) {
    await this.findOne(workspaceId, userId);

    const updateUserData: any = {};
    if (dto.name && dto.name.trim()) {
      updateUserData.name = dto.name.trim();
    }
    if (dto.phone) {
      const cleanPhone = dto.phone.replace(/[\s\-\+\(\)]/g, '');
      if (cleanPhone.length >= 6) {
        const existingWithPhone = await this.prisma.user.findFirst({
          where: {
            id: { not: userId },
            OR: [
              { phoneNumber: cleanPhone },
              { username: cleanPhone },
            ],
          },
        });
        if (existingWithPhone) {
          throw new ConflictException(`Phone number ${dto.phone} is already assigned to another user.`);
        }
        updateUserData.phoneNumber = cleanPhone;
        updateUserData.username = cleanPhone;
      }
    }
    if (dto.email) {
      updateUserData.email = dto.email.trim();
    }

    if (Object.keys(updateUserData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateUserData,
      });
    }

    if (dto.role) {
      const orgRole = toOrgRole(dto.role as any);
      await this.prisma.member.updateMany({
        where: { organizationId: workspaceId, userId },
        data: { role: orgRole },
      });
    }

    if (dto.vehicle !== undefined) {
      await this.prisma.agentProfile.upsert({
        where: { userId },
        create: { userId, vehicle: dto.vehicle || null },
        update: { vehicle: dto.vehicle || null },
      });
    }

    if (dto.password && dto.password.length >= 6) {
      try {
        await (auth.api as any).setUserPassword({
          body: { userId, newPassword: dto.password },
        });
      } catch (err) {
        console.warn('Could not update password via auth.api:', err);
      }
    }

    return this.findOne(workspaceId, userId);
  }

  /** Removes a teammate's membership from the workspace and suspends access. */
  async remove(workspaceId: string, userId: string) {
    await this.findOne(workspaceId, userId);
    await this.prisma.member.deleteMany({
      where: { organizationId: workspaceId, userId },
    });
    try {
      await auth.api.banUser({ body: { userId, banReason: 'Removed by workspace owner' } as any });
    } catch {
      // ignore ban error if already handled
    }
    return { success: true };
  }
}
