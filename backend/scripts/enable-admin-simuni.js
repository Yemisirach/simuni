const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const topwaterAdmin = await prisma.user.findUnique({
    where: { email: 'admin2@topwater.local' },
    include: { accounts: true }
  });

  const simuniAdmin = await prisma.user.findUnique({
    where: { email: 'admin@simuni.local' },
    include: { accounts: true }
  });

  if (!topwaterAdmin || !simuniAdmin) {
    console.log('Users not found');
    return;
  }

  const sampleAccount = topwaterAdmin.accounts[0];
  if (!sampleAccount || !sampleAccount.password) {
    console.log('No password account found');
    return;
  }

  console.log('Password hash found from admin2:', sampleAccount.password.slice(0, 10));

  // Upsert account for admin@simuni.local
  const existing = await prisma.account.findFirst({
    where: { userId: simuniAdmin.id, providerId: 'credential' }
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: sampleAccount.password }
    });
    console.log('Updated existing account for admin@simuni.local');
  } else {
    await prisma.account.create({
      data: {
        userId: simuniAdmin.id,
        accountId: simuniAdmin.id,
        providerId: 'credential',
        password: sampleAccount.password
      }
    });
    console.log('Created new credential account for admin@simuni.local with password123');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
