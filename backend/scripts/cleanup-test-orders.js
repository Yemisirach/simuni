const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const start = new Date('2026-10-01T00:00:00.000Z');
  const end = new Date('2026-10-02T00:00:00.000Z');

  // Find all orders created today
  const todayOrders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { id: true, customerId: true }
  });

  console.log(`Found ${todayOrders.length} orders created today.`);

  for (const o of todayOrders) {
    // Delete payments
    await prisma.payment.deleteMany({
      where: { invoice: { orderId: o.id } }
    });
    // Delete invoices
    await prisma.invoice.deleteMany({
      where: { orderId: o.id }
    });
    // Delete deliveries
    await prisma.delivery.deleteMany({
      where: { orderId: o.id }
    });
    // Delete order items
    await prisma.orderItem.deleteMany({
      where: { orderId: o.id }
    });
    // Delete route stops linked to customer if spot sale
    await prisma.routeStop.deleteMany({
      where: { customerId: o.customerId }
    });
    // Delete order
    await prisma.order.delete({
      where: { id: o.id }
    });
    // Delete test spot customer
    if (o.customerId) {
      await prisma.customer.deleteMany({
        where: { id: o.customerId, name: { startsWith: 'Spot Sale' } }
      });
    }
  }

  // Remove today's snapshot from Organization metadata
  const org = await prisma.organization.findFirst();
  if (org && org.metadata) {
    try {
      const meta = JSON.parse(org.metadata);
      if (meta.dailySalesSnapshots && meta.dailySalesSnapshots['2026-10-01']) {
        delete meta.dailySalesSnapshots['2026-10-01'];
        await prisma.organization.update({
          where: { id: org.id },
          data: { metadata: JSON.stringify(meta) }
        });
        console.log('Removed 2026-10-01 snapshot from Organization metadata.');
      }
    } catch (e) {
      console.error('Error parsing metadata:', e);
    }
  }

  console.log('Cleanup finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
