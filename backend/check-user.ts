require('dotenv').config();
import { PrismaClient } from '@prisma/client';
import { getNeonAdapter } from './src/prisma/prisma-client';

const prisma = new PrismaClient({ adapter: getNeonAdapter() });
async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'driver@simuni.local' } });
  console.log(user);
}
check().finally(() => prisma.$disconnect());
