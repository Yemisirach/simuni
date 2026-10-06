import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SimuniRole } from '../auth/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(SimuniRole.OWNER, SimuniRole.MANAGER)
  @Post()
  create(@CurrentUser() user, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.usersService.findAll(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.usersService.findOne(user.workspaceId, id);
  }

  @Roles(SimuniRole.OWNER, SimuniRole.MANAGER)
  @Patch(':id')
  update(@CurrentUser() user, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.workspaceId, id, dto);
  }

  @Roles(SimuniRole.OWNER, SimuniRole.MANAGER)
  @Delete(':id')
  remove(@CurrentUser() user, @Param('id') id: string) {
    return this.usersService.remove(user.workspaceId, id);
  }
}
