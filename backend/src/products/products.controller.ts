import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  create(@CurrentUser() user, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.productsService.findAll(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.productsService.findOne(user.workspaceId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user, @Param('id') id: string) {
    return this.productsService.remove(user.workspaceId, id);
  }
}
