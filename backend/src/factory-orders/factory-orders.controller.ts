import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { FactoryOrdersService } from './factory-orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('factory-orders')
export class FactoryOrdersController {
  constructor(private readonly factoryOrdersService: FactoryOrdersService) {}

  @Get('balance')
  getBalance(@CurrentUser() user) {
    return this.factoryOrdersService.getBalance(user.workspaceId);
  }

  @Post('topup')
  topUp(@CurrentUser() user, @Body() body: { amount: number }) {
    return this.factoryOrdersService.topUp(user.workspaceId, body.amount);
  }

  @Post('reverse-topup')
  reverseTopUp(@CurrentUser() user, @Body() body: { amount: number }) {
    return this.factoryOrdersService.reverseTopUp(user.workspaceId, body.amount);
  }

  @Post('set-balance')
  setBalance(@CurrentUser() user, @Body() body: { balance: number }) {
    return this.factoryOrdersService.setBalance(user.workspaceId, body.balance);
  }

  @Post()
  create(@CurrentUser() user, @Body() createFactoryOrderDto: any) {
    return this.factoryOrdersService.create(user.workspaceId, createFactoryOrderDto);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.factoryOrdersService.findAll(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.factoryOrdersService.findOne(user.workspaceId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user, @Param('id') id: string, @Body() updateFactoryOrderDto: any) {
    return this.factoryOrdersService.update(user.workspaceId, id, updateFactoryOrderDto);
  }
}
