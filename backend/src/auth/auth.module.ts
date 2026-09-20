import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthNestModule } from '@thallesp/nestjs-better-auth';
import { auth } from './better-auth.instance';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({
  imports: [
    // Mounts Better Auth's own routes (sign-in, sign-out, session, forgot
    // password, organization/*, admin/*, etc.) under basePath
    // ("/api/v1/auth", configured in better-auth.instance.ts). Combined with
    // the AuthGuard registered globally in app.module.ts, every route in
    // this app requires a valid session unless annotated with @Public().
    BetterAuthNestModule.forRoot({ auth }),
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
})
export class AuthModule {}
