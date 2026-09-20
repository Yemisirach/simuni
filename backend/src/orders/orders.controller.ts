import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.workspaceId, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.ordersService.findAll(user.workspaceId);
  }

  /** Orders (mostly from the Telegram bot) with no agent delivering them yet. */
  @Get('unclaimed')
  findUnclaimed(@CurrentUser() user) {
    return this.ordersService.findUnclaimed(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.ordersService.findOne(user.workspaceId, id);
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser() user, @Param('id') id: string) {
    return this.ordersService.confirm(user.workspaceId, id);
  }
}
