import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  dailySales(@CurrentUser() user, @Query('date') date?: string) {
    return this.reportsService.dailySales(user.workspaceId, date);
  }
}
