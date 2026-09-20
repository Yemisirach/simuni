import { Module } from '@nestjs/common';
import { RoutingModule } from '../routing/routing.module';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';

@Module({
  imports: [RoutingModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
