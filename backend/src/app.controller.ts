import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'gestion-aetv-api',
      time: new Date().toISOString(),
    };
  }
}