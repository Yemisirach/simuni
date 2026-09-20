import { Module } from '@nestjs/common';
import { GpsModule } from '../gps/gps.module';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [GpsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
