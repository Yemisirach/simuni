import { Module } from '@nestjs/common';
import { FactoryOrdersService } from './factory-orders.service';
import { FactoryOrdersController } from './factory-orders.controller';

@Module({
  controllers: [FactoryOrdersController],
  providers: [FactoryOrdersService],
})
export class FactoryOrdersModule {}
