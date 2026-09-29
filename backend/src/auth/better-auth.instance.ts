import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization, admin, username, phoneNumber, bearer } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

import { getNeonAdapter } from '../prisma/prisma-client';

// Better Auth wants its own PrismaClient instance to introspect the models
// above (User, Session, Account, Verification, Organization, Member,
// Invitation) — it's fine for this to be separate from PrismaService, which
// the rest of the app uses for domain queries; both point at the same DB.
const prisma = new PrismaClient({ adapter: getNeonAdapter() });

/**
 * The single Better Auth instance for the whole API.
 *
 * - `username` plugin: field workers log in with their phone number, not an
 *   email address. We store the phone in Better Auth's own `phoneNumber`
 *   column and mirror it into `username` so email+password style sign-in
 *   ("identifier" = username) works without a custom credential provider.
 * - `organization` plugin: a Better Auth "organization" = a Simuni
 *   "workspace". `activeOrganizationId` on the session is how we scope every
 *   request to one tenant (see auth/current-workspace.decorator.ts).
 * - `admin` plugin: lets a workspace OWNER call `auth.api.createUser` to
 *   provision Manager/Agent accounts server-side (see users.service.ts)
 *   instead of agents self-registering.
 *
 * IMPORTANT: this has not been executed against a real Postgres instance in
 * this environment (no network access here). After `npm install`, run
 * `npx @better-auth/cli generate` and reconcile its output with
 * prisma/schema.prisma before your first migration.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/v1/auth',

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days, matches the previous JWT_EXPIRES_IN default
  },

  plugins: [
    // Mobile clients (the Expo agent app) can't rely on browser cookies, so
    // they authenticate with `Authorization: Bearer <token>` instead. The
    // bearer plugin makes Better Auth accept that header and echo a token
    // back in the `set-auth-token` response header on sign-in — the mobile
    // client's api/client.ts stores that as `simuni_token`.
    bearer(),
    username({
      // Agents type their phone number into the "username" field on the
      // mobile login screen; nothing else changes about the flow.
      minUsernameLength: 6,
    }),
    phoneNumber({
      // Not used for OTP here (Simuni uses password login), but keeping the
      // plugin enabled gives us phone verification later at no extra cost.
      sendOTP: async () => {
        // Wire up an SMS provider (e.g. AfroMessage, Twilio) here if/when
        // Simuni adds phone-verify or passwordless OTP login.
      },
    }),
    organization({
      // Only a workspace OWNER can create additional workspaces from inside
      // the product; the very first organization is created at signup time
      // in auth/registration.service.ts.
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      membershipLimit: 200,
    }),
    admin(),
  ],

  advanced: {
    disableCSRFCheck: true,
    disableOriginCheck: true,
  },

  trustedOrigins: [
    'http://localhost:19006',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:3000',
    'http://localhost:3010',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3010',
    'http://172.20.10.7:8082',
    'http://172.20.10.7:3000',
    'http://172.20.10.7:3010',
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
  ],
});

export type Auth = typeof auth;
