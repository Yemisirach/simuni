const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      members: {
        include: {
          organization: true
        }
      }
    }
  });
  console.log('Total Users:', users.length);
  for (const u of users) {
    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber,
      role: u.role,
      accounts: u.accounts.map(a => ({
        id: a.id,
        providerId: a.providerId,
        accountId: a.accountId,
        hasPassword: !!a.password
      })),
      members: u.members.map(m => ({
        role: m.role,
        orgName: m.organization?.name,
        orgSlug: m.organization?.slug
      }))
    });
  }
}

main().finally(() => prisma.$disconnect());
