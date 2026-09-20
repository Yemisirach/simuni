import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post('orders/:orderId/generate')
  generate(@CurrentUser() user, @Param('orderId') orderId: string) {
    return this.invoicesService.generate(user.workspaceId, orderId);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.invoicesService.findAll(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.invoicesService.findOne(user.workspaceId, id);
  }

  @Patch(':id/payment-status')
  setPaymentStatus(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID',
  ) {
    return this.invoicesService.setPaymentStatus(user.workspaceId, id, paymentStatus);
  }

  /** Re-renders the PDF (e.g. after correcting an order) and re-uploads it. */
  @Post(':id/pdf/regenerate')
  regeneratePdf(@CurrentUser() user, @Param('id') id: string) {
    return this.invoicesService.regeneratePdf(user.workspaceId, id);
  }

  /** MinIO signed URLs expire — call this to get a fresh download link. */
  @Post(':id/pdf/refresh-url')
  refreshPdfUrl(@CurrentUser() user, @Param('id') id: string) {
    return this.invoicesService.refreshPdfUrl(user.workspaceId, id);
  }
}
