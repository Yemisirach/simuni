import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [CustomersModule, ProductsModule, OrdersModule],
  providers: [TelegramService],
})
export class TelegramModule {}
