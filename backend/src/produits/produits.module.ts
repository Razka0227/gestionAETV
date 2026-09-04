import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ProduitsController } from './produits.controller.js';
import { ProduitsService } from './produits.service.js';

@Module({
  imports: [AuditModule],
  controllers: [ProduitsController],
  providers: [ProduitsService],
})
export class ProduitsModule {}