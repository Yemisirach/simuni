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

  console.log('--- Database State ---');
  
  const orgs = await prisma.organization.findMany();
  console.log(`\nOrganizations (${orgs.length}):`);
  orgs.forEach(o => console.log(` - [${o.id}] ${o.name} (Slug: ${o.slug})`));

  const products = await prisma.product.findMany({ include: { workspace: true }});
  console.log(`\nProducts (${products.length}):`);
  products.forEach(p => console.log(` - [${p.id}] ${p.name} - ${p.price} ETB (Org: ${p.workspace?.name})`));

  const users = await prisma.user.findMany({ include: { members: { include: { organization: true } } } });
  console.log(`\nUsers (${users.length}):`);
  users.forEach(u => {
    const roles = u.members.map(m => `${m.role} @ ${m.organization?.name}`).join(', ');
    console.log(` - [${u.id}] ${u.name || 'No Name'} (${u.email || u.username}) - ${roles}`);
  });

  const agents = await prisma.agentProfile.findMany({ include: { user: true } });
  console.log(`\nAgent Profiles (${agents.length}):`);
  agents.forEach(a => console.log(` - [${a.userId}] ${a.user?.name} (Status: ${a.isOnline ? 'Online' : 'Offline'})`));

  const customers = await prisma.customer.findMany();
  console.log(`\nCustomers (${customers.length}):`);
  customers.forEach(c => console.log(` - [${c.id}] ${c.name} (${c.phone}) - Zone: ${c.zoneId || 'Unassigned'}`));

  const routes = await prisma.route.findMany();
  console.log(`\nRoutes (${routes.length}):`);
  routes.forEach(r => console.log(` - [${r.id}] ${r.name} (Date: ${r.date.toISOString().split('T')[0]}) - Status: ${r.status} - Zone: ${r.zoneId || 'Unassigned'}`));

  await prisma.$disconnect();
}

main().catch(console.error);
