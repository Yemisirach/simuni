import 'dotenv/config';
import { PrismaClient, RouteStatus, StopStatus, OrderStatus, OrderSource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Simuni Database Seed...');

  // 1. Create Workspace
  const workspace = await prisma.organization.upsert({
    where: { slug: 'addis-ababa-hub' },
    update: {},
    create: {
      name: 'Addis Ababa Hub',
      slug: 'addis-ababa-hub',
      metadata: JSON.stringify({ currency: 'ETB', timezone: 'Africa/Nairobi' }),
    },
  });
  console.log(`✅ Workspace created: ${workspace.name}`);

  // 2. Create Owner User
  const owner = await prisma.user.upsert({
    where: { email: 'admin@simuni.local' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@simuni.local',
      role: 'admin',
      members: {
        create: {
          organizationId: workspace.id,
          role: 'owner'
        }
      }
    }
  });
  console.log(`✅ Owner created: ${owner.email}`);

  // 3. Create One Default Agent (so you can still log into the mobile app)
  const defaultAgent = await prisma.user.upsert({
    where: { phoneNumber: '0911000003' },
    update: {},
    create: {
      name: 'Test Driver',
      email: 'driver@simuni.local',
      phoneNumber: '0911000003',
      role: 'agent',
      members: {
        create: {
          organizationId: workspace.id,
          role: 'member'
        }
      },
      agentProfile: {
        create: {
          vehicle: 'Test Van',
          isOnline: true,
          lastLat: 9.0292,
          lastLng: 38.7530
        }
      }
    }
  });
  console.log(`✅ Default Agent created: ${defaultAgent.name} (Phone: ${defaultAgent.phoneNumber}) - Use this to log into the mobile app.`);

  // 4. Create Products (Topwater)
  const productsData = [
    { name: 'Topwater 0.35L', sku: 'TOP-0.35L', price: 252.00 },
    { name: 'Topwater 0.6L', sku: 'TOP-0.6L', price: 300.00 },
    { name: 'Topwater 1L', sku: 'TOP-1L', price: 252.00 },
    { name: 'Topwater 2L', sku: 'TOP-2L', price: 300.00 },
  ];

  const products: any[] = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        workspaceId: workspace.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
      }
    });
    products.push(prod);
  }
  console.log(`✅ ${products.length} Topwater Products created`);

  console.log('🎉 Seeding complete! Database is clean and ready for your MVP.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
