import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { fromOrgRole } from '../roles';

/**
 * Runs on every request (registered as a global APP_GUARD in app.module.ts),
 * right after Better Auth's own guard has attached `request.session`
 * ({ user, session }). Resolves which workspace (Better Auth "organization")
 * this request belongs to and mutates `request.session.user` in place so
 * every controller/service written against the old `user.workspaceId` /
 * `user.role` shape keeps working unchanged.
 *
 * Resolution order:
 *   1. `session.session.activeOrganizationId`, if the client already called
 *      Better Auth's `organization/set-active` endpoint.
 *   2. Otherwise, the user's one-and-only Member row — Simuni's MVP model is
 *      one workspace per user, so this covers the common case without an
 *      extra client round-trip after login.
 */
@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session?.user) return true;

    let workspaceId: string | undefined = session.session?.activeOrganizationId;
    let role: string | undefined;

    if (workspaceId) {
      const membership = await this.prisma.member.findUnique({
        where: { organizationId_userId: { organizationId: workspaceId, userId: session.user.id } },
      });
      role = membership?.role;
    } else {
      const membership = await this.prisma.member.findFirst({ where: { userId: session.user.id } });
      if (!membership) {
        throw new ForbiddenException('This account is not a member of any Simuni workspace yet.');
      }
      workspaceId = membership.organizationId;
      role = membership.role;
    }

    const resolvedRole = fromOrgRole(role || 'member');
    const userCopy = {
      ...session.user,
      workspaceId,
      role: resolvedRole,
      orgRole: role || 'member',
    };

    request._simuniUser = userCopy;
    request.user = userCopy;
    request.workspaceId = workspaceId;

    try {
      Object.defineProperty(request, 'user', { value: userCopy, configurable: true, writable: true });
    } catch {}

    return true;
  }
}
