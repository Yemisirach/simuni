const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, lat: true, lng: true, address: true, category: true, phone: true }
  });
  console.log('Total customers:', customers.length);
  const withCoords = customers.filter(c => c.lat && c.lng);
  console.log('With coords:', withCoords.length);
  console.log('Sample:');
  for (const c of withCoords.slice(0, 10)) {
    console.log(`- ${c.name} (${c.category || 'N/A'}): ${c.lat}, ${c.lng} - ${c.address}`);
  }
}

main().finally(() => prisma.$disconnect());
