import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SimuniRole } from '../../auth/roles';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Checks `request.session.user.role` (a SimuniRole string set by
 * WorkspaceContextGuard) against the roles required by @Roles(...) on the
 * handler/controller. Must run after WorkspaceContextGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SimuniRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest();
    const user = req._simuniUser || req.user || req.session?.user;
    if (!user) return false;

    const userRole = (user.role || '').toUpperCase();
    const orgRole = (user.orgRole || '').toUpperCase();

    // Check if required roles match:
    // OWNER: matches SimuniRole.OWNER, orgRole 'OWNER', or userRole 'OWNER'
    // MANAGER: matches SimuniRole.MANAGER, orgRole 'ADMIN' / 'OWNER', or userRole 'ADMIN' / 'OWNER'
    const isOwner = userRole === 'OWNER' || orgRole === 'OWNER';
    const isManager = isOwner || userRole === 'MANAGER' || orgRole === 'ADMIN' || userRole === 'ADMIN';

    if (requiredRoles.includes(SimuniRole.OWNER) && isOwner) return true;
    if (requiredRoles.includes(SimuniRole.MANAGER) && isManager) return true;
    if (requiredRoles.includes(SimuniRole.AGENT)) return true;

    return requiredRoles.includes(user.role as SimuniRole);
  }
}
