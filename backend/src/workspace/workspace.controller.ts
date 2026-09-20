import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SimuniRole } from '../auth/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceService } from './workspace.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@UseGuards(RolesGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get('me')
  findMine(@CurrentUser() user) {
    return this.workspaceService.findOne(user.workspaceId);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user) {
    return this.workspaceService.dashboard(user.workspaceId);
  }

  /** The link a business shares with customers to start ordering via Telegram. */
  @Get('telegram-link')
  async telegramLink(@CurrentUser() user) {
    const workspace = await this.workspaceService.findOne(user.workspaceId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return { enabled: false, message: 'TELEGRAM_BOT_USERNAME is not configured on the server.' };
    }
    return { enabled: true, url: `https://t.me/${botUsername}?start=${workspace?.slug}` };
  }

  @Roles(SimuniRole.OWNER)
  @Patch()
  update(@CurrentUser() user, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaceService.update(user.workspaceId, dto);
  }
}
