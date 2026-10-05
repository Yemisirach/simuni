require('dotenv').config();
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;
const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const wsOrg = await prisma.organization.findFirst();
  console.log('Testing org:', wsOrg.id, wsOrg.name);
  const minLat = 9.02, maxLat = 9.05, minLng = 38.82, maxLng = 38.86;
  const customers = await prisma.customer.findMany({
    where: {
      workspaceId: wsOrg.id,
      lat: { gte: minLat, lte: maxLat },
      lng: { gte: minLng, lte: maxLng },
    },
    take: 50,
    select: { id: true, name: true, lat: true, lng: true }
  });
  console.log('Viewport query returned:', customers.length, 'stops in box.');
  console.log('Sample:', customers.slice(0, 3));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
