import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { VentesController } from './ventes.controller.js';
import { VentesService } from './ventes.service.js';

@Module({
  imports: [AuditModule],
  controllers: [VentesController],
  providers: [VentesService],
})
export class VentesModule {}