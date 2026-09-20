import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(workspaceId: string, dto: CreateProductDto) {
    return this.prisma.product.create({ data: { ...dto, workspaceId } });
  }

  findAll(workspaceId: string) {
    return this.prisma.product.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  }

  async findOne(workspaceId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, workspaceId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(workspaceId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(workspaceId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.product.delete({ where: { id } });
  }
}
