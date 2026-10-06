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
  const products = await prisma.product.findMany();
  const prodMap = new Map(products.map(p => [p.id, p]));

  const org = await prisma.organization.findFirst();
  const meta = JSON.parse(org.metadata || '{}');
  const snaps = meta.dailySalesSnapshots || {};
  for (const date of Object.keys(snaps).sort()) {
    const s = snaps[date];
    const dayOfWeek = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    console.log(`\n=== Date: ${date} (${dayOfWeek}) | Market: ${s.market} | PriceTier: ${s.priceTier} ===`);
    if (s.variants) {
      for (const v of s.variants) {
        const prod = prodMap.get(v.productId);
        const name = prod?.name || v.variant || v.productId;
        const sellP = v.sellingPrice;
        const buyP = v.factoryPrice;
        const sold = v.soldQty;
        const margin = (sellP - buyP) * sold;
        console.log(`  ${name.padEnd(25)} | open: ${String(v.openingStock).padStart(3)} | in: ${String(v.factoryReceived).padStart(3)} | sold: ${String(sold).padStart(3)} | close: ${String(v.closingStock).padStart(3)} | sell: ${sellP} | buy: ${buyP} | unitMargin: ${sellP - buyP} | margin: ${margin}`);
      }
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
