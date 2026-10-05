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
  const count = await prisma.customer.count();
  console.log('Total customers in database:', count);
  const sample = await prisma.customer.findMany({
    where: { lat: { not: null } },
    take: 5,
    select: { id: true, name: true, lat: true, lng: true }
  });
  console.log('Sample:', sample);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
