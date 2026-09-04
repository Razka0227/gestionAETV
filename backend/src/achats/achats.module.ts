import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AchatsController } from './achats.controller.js';
import { AchatsService } from './achats.service.js';

@Module({
  imports: [AuditModule],
  controllers: [AchatsController],
  providers: [AchatsService],
})
export class AchatsModule {}