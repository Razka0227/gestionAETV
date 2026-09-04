import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { StockController } from './stock.controller.js';
import { StockService } from './stock.service.js';

@Module({
  imports: [AuditModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}