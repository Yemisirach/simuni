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

    // Better Auth's own guard should already have rejected unauthenticated
    // requests; this is a defensive fallback (e.g. for @AllowAnonymous()
    // routes that don't need workspace context at all).
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

    session.user.workspaceId = workspaceId;
    session.user.role = fromOrgRole(role || 'member');
    request.user = session.user;
    request.workspaceId = workspaceId;

    return true;
  }
}
