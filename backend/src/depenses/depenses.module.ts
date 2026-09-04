import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DepensesController } from './depenses.controller.js';
import { DepensesService } from './depenses.service.js';

@Module({
  imports: [AuditModule],
  controllers: [DepensesController],
  providers: [DepensesService],
})
export class DepensesModule {}