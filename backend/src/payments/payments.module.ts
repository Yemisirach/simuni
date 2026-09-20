import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TelebirrService } from './telebirr.service';

@Module({
  imports: [InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, TelebirrService],
})
export class PaymentsModule {}
