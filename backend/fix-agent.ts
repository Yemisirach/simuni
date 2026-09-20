import { PrismaClient } from '@prisma/client';
import { auth } from './src/auth/better-auth.instance';
import { getNeonAdapter } from './src/prisma/prisma-client';

const prisma = new PrismaClient({ adapter: getNeonAdapter() });

async function fix() {
  console.log('Fixing agent account...');
  const phone = '0911000003';
  const email = 'driver@simuni.local';
  const password = 'password123'; // The password they will use!

  // Delete old user so we can recreate it properly with better-auth
  await prisma.user.deleteMany({ where: { email } });

  // Create the agent properly with Better Auth
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: 'Test Driver',
      username: phone, // This is what mobile login uses
    } as any,
  });

  const userId = (signUpResult as any).user.id;

  // Find the workspace
  const workspace = await prisma.organization.findFirst();
  if (!workspace) throw new Error("No workspace found. Register first.");

  // Add the agent to the workspace
  await prisma.member.create({
    data: { userId, organizationId: workspace.id, role: 'member' }
  });

  // Create agent profile
  await prisma.agentProfile.create({
    data: {
      userId,
      vehicle: 'Test Van',
      isOnline: true,
      lastLat: 9.0292,
      lastLng: 38.7530
    }
  });

  console.log(`✅ Driver fixed! Phone: ${phone}, Password: ${password}`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
