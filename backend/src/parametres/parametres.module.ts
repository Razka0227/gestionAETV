import { Module } from '@nestjs/common';
import { ParametresController } from './parametres.controller.js';
import { ParametresService } from './parametres.service.js';

@Module({
  controllers: [ParametresController],
  providers: [ParametresService],
  exports: [ParametresService],
})
export class ParametresModule {}