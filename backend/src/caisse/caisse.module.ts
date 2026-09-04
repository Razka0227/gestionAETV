import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { CaisseController } from './caisse.controller.js';
import { CaisseService } from './caisse.service.js';

@Module({
  imports: [AuditModule],
  controllers: [CaisseController],
  providers: [CaisseService],
})
export class CaisseModule {}