const { PrismaClient } = require('@prisma/client');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const ws = require('ws');
require('dotenv').config();

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Linking new admin to Topwater Ethiopia...');
  
  const org = await prisma.organization.findUnique({
    where: { slug: 'topwaterethiopia' }
  });
  
  if (!org) {
    console.log("No organization found!");
    return;
  }
  
  const user = await prisma.user.findUnique({
    where: { email: 'admin2@topwater.local' }
  });
  
  if (!user) {
    console.log("No user found!");
    return;
  }

  // Create member record for the new user in Topwater
  await prisma.member.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'owner',
    }
  });
  
  // Set the user's role to admin for the whole system, just in case
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' }
  });
  
  // Create an agent user via Better Auth?
  
  console.log('Done linking! You can now log into Admin Web with: admin2@topwater.local / password123');
  await prisma.$disconnect();
}

main().catch(console.error);
