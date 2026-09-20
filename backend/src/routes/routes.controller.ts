import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { AssignAgentDto } from './dto/assign-agent.dto';

@Controller('routes')
export class RoutesController {
  constructor(private routesService: RoutesService) {}

  @Post()
  create(@CurrentUser() user, @Body() dto: CreateRouteDto) {
    return this.routesService.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.routesService.findAll(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.routesService.findOne(user.workspaceId, id);
  }

  @Get(':id/progress')
  progress(@CurrentUser() user, @Param('id') id: string) {
    return this.routesService.progress(user.workspaceId, id);
  }

  @Patch(':id/assign')
  assignAgent(@CurrentUser() user, @Param('id') id: string, @Body() dto: AssignAgentDto) {
    return this.routesService.assignAgent(user.workspaceId, id, dto);
  }

  @Patch(':id/start')
  start(@CurrentUser() user, @Param('id') id: string) {
    return this.routesService.start(user.workspaceId, id);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user, @Param('id') id: string) {
    return this.routesService.complete(user.workspaceId, id);
  }

  @Patch(':id/stops/:stopId/visit')
  visitStop(@CurrentUser() user, @Param('id') id: string, @Param('stopId') stopId: string) {
    return this.routesService.visitStop(user.workspaceId, id, stopId);
  }

  /** ?lat=&lng=&stopId= (stopId optional — defaults to the next PENDING stop). */
  @Get(':id/directions')
  directions(
    @CurrentUser() user,
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('stopId') stopId?: string,
  ) {
    return this.routesService.directionsToNextStop(
      user.workspaceId,
      id,
      { lat: Number(lat), lng: Number(lng) },
      stopId,
    );
  }

  @Post(':id/optimize')
  optimize(@CurrentUser() user, @Param('id') id: string, @Body('lat') lat: number, @Body('lng') lng: number) {
    return this.routesService.optimizeOrder(user.workspaceId, id, { lat, lng });
  }
}
