import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  create(workspaceId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { ...dto, workspaceId } });
  }

  /** Used by the Telegram bot — finds the customer already linked to this chat, if any. */
  findByTelegramChatId(chatId: string) {
    return this.prisma.customer.findUnique({ where: { telegramChatId: chatId } });
  }

  /**
   * First message from a new Telegram user in a given workspace: registers
   * them as a Customer and links this chat to that record going forward.
   * `phone` may be a Telegram-provided contact share or a typed number.
   */
  registerFromTelegram(workspaceId: string, chatId: string, name: string, phone: string) {
    return this.prisma.customer.create({
      data: { workspaceId, name, phone, telegramChatId: chatId, category: 'Telegram' },
    });
  }

  findAll(workspaceId: string) {
    return this.prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, workspaceId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(workspaceId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(workspaceId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.customer.delete({ where: { id } });
  }

  /** Order + payment history for a single customer, used on the customer profile screen. */
  async history(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.order.findMany({
      where: { customerId: id, workspaceId },
      include: { items: { include: { product: true } }, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
