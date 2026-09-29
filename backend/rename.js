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

  console.log('Renaming Organization...');
  const org = await prisma.organization.updateMany({
    where: { slug: 'addis-ababa-hub' },
    data: { name: 'Topwater Ethiopia', slug: 'topwaterethiopia' }
  });
  
  console.log('Update result:', org);
  await prisma.$disconnect();
}

main().catch(console.error);
