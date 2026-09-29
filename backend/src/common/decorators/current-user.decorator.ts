import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated user for the current request.
 *
 * WorkspaceContextGuard (see auth/guards/workspace-context.guard.ts) runs on
 * every request, reads the Better Auth session that @thallesp/nestjs-better-auth
 * attaches as `request.session`, and copies `.workspaceId` and `.role`
 * ("OWNER" | "MANAGER" | "AGENT") onto `request.session.user` so the rest of
 * the app can keep doing `user.workspaceId` / `user.role` / `user.id` exactly
 * as it did under the old hand-rolled JWT auth.
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user || request.session?.user;
});
