import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DeliveriesService } from './deliveries.service';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Get()
  findAll(@CurrentUser() user) {
    return this.deliveriesService.findAll(user.workspaceId);
  }

  @Patch(':orderId/start')
  start(@CurrentUser() user, @Param('orderId') orderId: string) {
    return this.deliveriesService.start(user.workspaceId, orderId, user.id);
  }

  @Patch(':orderId/arrive')
  arrive(
    @CurrentUser() user,
    @Param('orderId') orderId: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
  ) {
    return this.deliveriesService.arrive(user.workspaceId, orderId, lat, lng);
  }

  @Patch(':orderId/confirm')
  confirm(@CurrentUser() user, @Param('orderId') orderId: string) {
    return this.deliveriesService.confirm(user.workspaceId, orderId);
  }

  @Patch(':orderId/fail')
  fail(@CurrentUser() user, @Param('orderId') orderId: string) {
    return this.deliveriesService.fail(user.workspaceId, orderId);
  }
}
