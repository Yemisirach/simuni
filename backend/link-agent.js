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

  console.log('Linking new agent to Topwater Ethiopia...');
  
  const org = await prisma.organization.findUnique({
    where: { slug: 'topwaterethiopia' }
  });
  
  const user = await prisma.user.findUnique({
    where: { email: 'driver2@topwater.local' }
  });

  // Create member record for the new user in Topwater
  await prisma.member.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'member',
    }
  });
  
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'agent' }
  });
  
  await prisma.agentProfile.create({
    data: {
      userId: user.id,
      vehicle: 'VAN-02',
      isOnline: false,
    }
  });
  
  console.log('Done linking! You can now log into Mobile Web with Phone: 0911000002 / password123');
  await prisma.$disconnect();
}

main().catch(console.error);
