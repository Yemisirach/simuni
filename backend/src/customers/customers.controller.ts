import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(@CurrentUser() user, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.workspaceId, dto);
  }

  @Get('viewport')
  findInViewport(
    @CurrentUser() user,
    @Query('minLat') minLat?: string,
    @Query('maxLat') maxLat?: string,
    @Query('minLng') minLng?: string,
    @Query('maxLng') maxLng?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeIds') includeIds?: string,
  ) {
    return this.customersService.findInViewport(user.workspaceId, {
      minLat: minLat ? parseFloat(minLat) : undefined,
      maxLat: maxLat ? parseFloat(maxLat) : undefined,
      minLng: minLng ? parseFloat(minLng) : undefined,
      maxLng: maxLng ? parseFloat(maxLng) : undefined,
      limit: limit ? parseInt(limit, 10) : 350,
      search,
      includeIds: includeIds ? includeIds.split(',').filter(Boolean) : undefined,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user,
    @Query('minLat') minLat?: string,
    @Query('maxLat') maxLat?: string,
    @Query('minLng') minLng?: string,
    @Query('maxLng') maxLng?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeIds') includeIds?: string,
  ) {
    if (minLat || maxLat || minLng || maxLng || limit || search || includeIds) {
      return this.customersService.findInViewport(user.workspaceId, {
        minLat: minLat ? parseFloat(minLat) : undefined,
        maxLat: maxLat ? parseFloat(maxLat) : undefined,
        minLng: minLng ? parseFloat(minLng) : undefined,
        maxLng: maxLng ? parseFloat(maxLng) : undefined,
        limit: limit ? parseInt(limit, 10) : 350,
        search,
        includeIds: includeIds ? includeIds.split(',').filter(Boolean) : undefined,
      });
    }
    return this.customersService.findAll(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.customersService.findOne(user.workspaceId, id);
  }

  @Get(':id/history')
  history(@CurrentUser() user, @Param('id') id: string) {
    return this.customersService.history(user.workspaceId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(user.workspaceId, id, dto);
  }

  @Post('seed-addis')
  seedAddis(
    @CurrentUser() user,
    @Body('locations') locations: any[],
    @Body('applyToAllWorkspaces') applyToAllWorkspaces?: boolean,
  ) {
    return this.customersService.seedAddisLocations(
      user.workspaceId,
      locations,
      Boolean(applyToAllWorkspaces),
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user, @Param('id') id: string) {
    return this.customersService.remove(user.workspaceId, id);
  }
}
