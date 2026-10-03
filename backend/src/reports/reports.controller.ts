import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  dailySales(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.reportsService.dailySales(user?.workspaceId, date);
  }

  @Post('daily-sales/inventory-snapshot')
  saveInventorySnapshot(@CurrentUser() user: any, @Body() data: any) {
    return this.reportsService.saveInventorySnapshot(user?.workspaceId, data);
  }

  @Delete('daily-sales')
  resetDailySales(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.reportsService.resetDailySales(user?.workspaceId, date);
  }

  @Get('daily-sales/previous')
  getPreviousReport(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.reportsService.getPreviousReport(user?.workspaceId, date);
  }

  @Get('weekly-finance')
  weeklyFinance(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.weeklyFinanceReport(user?.workspaceId, startDate, endDate);
  }
}
