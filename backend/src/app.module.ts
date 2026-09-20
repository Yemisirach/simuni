import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceContextGuard } from './auth/guards/workspace-context.guard';
import { WorkspaceModule } from './workspace/workspace.module';
import { UsersModule } from './users/users.module';
import { AgentsModule } from './agents/agents.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { RoutesModule } from './routes/routes.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { TelegramModule } from './telegram/telegram.module';
import { GpsModule } from './gps/gps.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    WorkspaceModule,
    UsersModule,
    AgentsModule,
    CustomersModule,
    ProductsModule,
    RoutesModule,
    OrdersModule,
    DeliveriesModule,
    InvoicesModule,
    PaymentsModule,
    TelegramModule,
    GpsModule,
  ],
  providers: [
    // Order matters: Better Auth's own guard runs first (rejects requests
    // with no valid session, respects @Public()), then WorkspaceContextGuard
    // resolves which workspace + role the now-authenticated caller has
    // (see workspace-context.guard.ts).
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: WorkspaceContextGuard },
  ],
})
export class AppModule {}
