import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { auth } from './better-auth.instance';
import { RegisterWorkspaceDto } from './dto/register-workspace.dto';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class RegistrationService {
  constructor(private prisma: PrismaService) {}

  /**
   * "Create Simuni Workspace" — the one moment in the product where a user
   * doesn't already belong to a workspace, so it has to stay outside Better
   * Auth's normal "sign in to an existing account" flow.
   *
   * Two steps:
   *  1. Create the credential/user via Better Auth (`signUpEmail` — this is
   *     the same primitive used for the `emailAndPassword` + `username`
   *     plugins together, so the resulting user can log in with either).
   *  2. Create the Organization ("workspace") and the first Member row with
   *     role "owner" directly via Prisma — Better Auth's organization plugin
   *     tables are plain Prisma tables, so this is just a normal write, no
   *     different from creating a Customer or Product.
   */
  async registerWorkspace(dto: RegisterWorkspaceDto) {
    const email = dto.email || `${dto.phone}@users.simuni.app`;

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password: dto.password,
        name: dto.ownerName,
        username: dto.phone,
      } as any,
    });

    const userId = (signUpResult as any).user.id;

    const baseSlug = slugify(dto.workspaceName);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const workspace = await this.prisma.organization.create({
      data: {
        name: dto.workspaceName,
        slug,
        metadata: JSON.stringify({ currency: 'ETB' }),
        members: { create: { userId, role: 'owner' } },
      },
    });

    return {
      message: 'Workspace created. Sign in with your phone number and password.',
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
      user: { id: userId, name: dto.ownerName, phone: dto.phone },
    };
  }
}
