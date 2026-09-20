import { SetMetadata } from '@nestjs/common';
import { SimuniRole } from '../../auth/roles';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: SimuniRole[]) => SetMetadata(ROLES_KEY, roles);
