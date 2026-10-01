import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FactoryOrdersService {
  constructor(private prisma: PrismaService) {}

  private async resolveWorkspaceId(workspaceId?: string): Promise<string> {
    if (workspaceId) return workspaceId;
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No workspace found');
    return org.id;
  }

  async getBalance(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const org = await this.prisma.organization.findUnique({ where: { id: wsId } });
    return { balance: org?.factoryBalance || 0 };
  }

  async topUp(workspaceId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Top up amount must be positive');
    const wsId = await this.resolveWorkspaceId(workspaceId);

    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: wsId } });
      if (!org) throw new NotFoundException('Organization not found');
      
      const newBalance = Number(org.factoryBalance) + Number(amount);

      await tx.organization.update({
        where: { id: wsId },
        data: { factoryBalance: newBalance }
      });

      await tx.factoryTransaction.create({
        data: {
          workspaceId: wsId,
          type: 'TOP_UP',
          amount,
          balanceAfter: newBalance
        }
      });

      return { balance: newBalance };
    });
  }

  async create(workspaceId: string, data: any) {
    const totalBudget = data.items.reduce((sum, item) => sum + (item.quantity * item.buyPrice), 0);
    const wsId = await this.resolveWorkspaceId(workspaceId);
    
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: wsId } });
      if (!org) throw new NotFoundException('Organization not found');
      
      if (Number(org.factoryBalance) < totalBudget) {
        throw new BadRequestException(`Insufficient factory balance. Needed: ${totalBudget}, Available: ${org.factoryBalance}`);
      }
      
      const newBalance = Number(org.factoryBalance) - totalBudget;
      
      await tx.organization.update({
        where: { id: wsId },
        data: { factoryBalance: newBalance }
      });

      const orderDate = data.date ? new Date(data.date) : new Date();

      const order = await tx.factoryOrder.create({
        data: {
          workspaceId: wsId,
          totalBudget,
          date: orderDate,
          createdAt: orderDate,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              buyPrice: item.buyPrice,
              total: item.quantity * item.buyPrice
            }))
          }
        },
        include: {
          items: { include: { product: true } }
        }
      });
      
      // Update Product Inventory & Factory Price
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            factoryPrice: item.buyPrice
          }
        });
      }
      
      await tx.factoryTransaction.create({
        data: {
          workspaceId: wsId,
          type: 'ORDER_DEDUCTION',
          amount: totalBudget,
          balanceAfter: newBalance,
          referenceId: order.id,
          date: orderDate,
        }
      });
      
      return order;
    });
  }

  async findAll(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.prisma.factoryOrder.findMany({
      where: { workspaceId: wsId },
      include: {
        items: { include: { product: true } }
      },
      orderBy: { date: 'desc' }
    });
  }

  async getTransactions(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.prisma.factoryTransaction.findMany({
      where: { workspaceId: wsId },
      orderBy: { date: 'desc' }
    });
  }

  async findOne(workspaceId: string, id: string) {
    const order = await this.prisma.factoryOrder.findFirst({
      where: { id, workspaceId },
      include: {
        items: { include: { product: true } }
      }
    });
    if (!order) throw new NotFoundException('Factory order not found');
    return order;
  }

  update(workspaceId: string, id: string, data: any) {
    return this.prisma.factoryOrder.update({
      where: { id, workspaceId },
      data,
    });
  }
}
