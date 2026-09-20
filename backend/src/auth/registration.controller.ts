import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { RegistrationService } from './registration.service';
import { RegisterWorkspaceDto } from './dto/register-workspace.dto';

@Controller('workspace')
export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  /**
   * Public by design — this is how a brand new business gets onto Simuni.
   * Everything else in the API requires an authenticated, workspace-scoped
   * session (see WorkspaceContextGuard). Verify @Public() is still the
   * current decorator name for your installed version — it has been
   * @AllowAnonymous() in some docs/versions of this community package.
   */
  @Public()
  @Post('register')
  register(@Body() dto: RegisterWorkspaceDto) {
    return this.registrationService.registerWorkspace(dto);
  }
}
