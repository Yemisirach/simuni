import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { GpsService } from '../gps/gps.service';

@Controller('agents')
export class AgentsController {
  constructor(private agentsService: AgentsService, private gpsService: GpsService) {}

  @Get()
  findAll(@CurrentUser() user) {
    return this.agentsService.findAll(user.workspaceId);
  }

  @Get('live')
  liveStatus(@CurrentUser() user) {
    return this.agentsService.liveStatus(user.workspaceId);
  }

  @Patch(':id/vehicle')
  updateVehicle(@CurrentUser() user, @Param('id') id: string, @Body('vehicle') vehicle: string) {
    return this.agentsService.updateVehicle(user.workspaceId, id, vehicle);
  }

  /**
   * HTTP fallback for GPS pings, used by the mobile app's offline queue
   * (src/offline/queue.ts) to replay points that were captured while the
   * Socket.IO connection was down. Doesn't broadcast to the live map room
   * the way the socket path does (nobody's watching in real time for a
   * point that's minutes old); it just backfills GpsLog + last-known
   * position so route history and "last seen" stay accurate.
   */
  @Post('ping')
  ping(@CurrentUser() user, @Body() body: { routeId?: string; lat: number; lng: number }) {
    return this.gpsService.recordPing({ agentId: user.id, routeId: body.routeId, lat: body.lat, lng: body.lng });
  }
}
