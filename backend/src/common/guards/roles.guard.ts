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

    const { user } = context.switchToHttp().getRequest().session ?? {};
    return requiredRoles.includes(user?.role);
  }
}
