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
  console.log('1. Updating Product catalog with current active prices...');
  const products = await prisma.product.findMany();
  for (const p of products) {
    const name = (p.name || '').toLowerCase();
    let price = 250;
    let factoryPrice = 220;
    if (name.includes('0.6') || name.includes('2')) {
      price = 300;
      factoryPrice = 270;
    } else {
      price = 250;
      factoryPrice = 220;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: {
        price,
        factoryPrice,
      },
    });
    console.log(`  Updated ${p.name}: price=${price}, factoryPrice=${factoryPrice}`);
  }

  console.log('\n2. Updating dailySalesSnapshots in Organization metadata...');
  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error('No organization found');
  }

  const meta = JSON.parse(org.metadata || '{}');
  const snaps = meta.dailySalesSnapshots || {};

  // Map product IDs
  const prodByName = new Map();
  for (const p of products) {
    prodByName.set(p.name, p.id);
  }

  // Fix 2026-10-05 (Monday)
  if (snaps['2026-10-05']) {
    console.log('  Fixing 2026-10-05 snapshot...');
    snaps['2026-10-05'].priceTier = 'new';
    snaps['2026-10-05'].updatedAt = new Date().toISOString();
    for (const v of snaps['2026-10-05'].variants || []) {
      const prod = products.find(p => p.id === v.productId);
      const name = (prod?.name || v.variant || '').toLowerCase();
      if (name.includes('0.6') || name.includes('2')) {
        v.sellingPrice = 300;
        v.factoryPrice = 270;
      } else {
        v.sellingPrice = 250;
        v.factoryPrice = 220;
      }
      console.log(`    2026-10-05 ${prod?.name || v.productId}: sell=${v.sellingPrice}, factory=${v.factoryPrice}, sold=${v.soldQty}, margin=${(v.sellingPrice - v.factoryPrice) * v.soldQty}`);
    }
  }

  // Fix 2026-10-03 (Saturday)
  if (snaps['2026-10-03']) {
    console.log('  Fixing 2026-10-03 snapshot...');
    snaps['2026-10-03'].priceTier = 'new';
    for (const v of snaps['2026-10-03'].variants || []) {
      const prod = products.find(p => p.id === v.productId);
      const name = (prod?.name || v.variant || '').toLowerCase();
      if (name.includes('0.6') || name.includes('2')) {
        v.sellingPrice = 300;
        v.factoryPrice = 270;
      } else {
        v.sellingPrice = 250;
        v.factoryPrice = 220;
      }
    }
  }

  // Fix 2026-10-02 (Friday)
  if (snaps['2026-10-02']) {
    console.log('  Ensuring 2026-10-02 snapshot prices...');
    snaps['2026-10-02'].priceTier = 'new';
    for (const v of snaps['2026-10-02'].variants || []) {
      const prod = products.find(p => p.id === v.productId);
      const name = (prod?.name || v.variant || '').toLowerCase();
      if (name.includes('0.6') || name.includes('2')) {
        v.sellingPrice = 300;
        v.factoryPrice = 270;
      } else {
        v.sellingPrice = 250;
        v.factoryPrice = 220;
      }
    }
  }

  meta.dailySalesSnapshots = snaps;
  await prisma.organization.update({
    where: { id: org.id },
    data: { metadata: JSON.stringify(meta) },
  });

  console.log('\n3. Organization metadata updated successfully!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
