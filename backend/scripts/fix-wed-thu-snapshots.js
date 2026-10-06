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
  const org = await prisma.organization.findFirst();
  const meta = JSON.parse(org.metadata || '{}');
  const snaps = meta.dailySalesSnapshots || {};
  const products = await prisma.product.findMany();

  // Fix 2026-09-30 (Wednesday) and 2026-10-01 (Thursday)
  for (const date of ['2026-09-30', '2026-10-01']) {
    if (snaps[date]) {
      console.log(`Fixing snapshot for ${date}...`);
      snaps[date].priceTier = 'new';
      snaps[date].updatedAt = new Date().toISOString();
      for (const v of snaps[date].variants || []) {
        const prod = products.find(p => p.id === v.productId);
        const name = (prod?.name || v.variant || '').toLowerCase();
        if (name.includes('0.6') || name.includes('2')) {
          v.sellingPrice = 300;
          v.factoryPrice = 270;
        } else {
          v.sellingPrice = 250;
          v.factoryPrice = 220;
        }
        console.log(`  ${date} ${prod?.name}: sell=${v.sellingPrice}, factory=${v.factoryPrice}, sold=${v.soldQty}, margin=${(v.sellingPrice - v.factoryPrice) * v.soldQty}`);
      }
    }
  }

  meta.dailySalesSnapshots = snaps;
  await prisma.organization.update({
    where: { id: org.id },
    data: { metadata: JSON.stringify(meta) },
  });

  console.log('\nDatabase snapshots updated successfully!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
