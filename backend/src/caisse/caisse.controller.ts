import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsDateString, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CaisseService } from './caisse.service.js';
import {
  FermerCaisseDto,
  MouvementCaisseDto,
  OuvrirCaisseDto,
} from './dto/caisse.dto.js';

class JourQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

@Controller('caisse')
export class CaisseController {
  constructor(private readonly caisse: CaisseService) {}

  @Get()
  @Permissions('caisse.view')
  etat() {
    return this.caisse.etat();
  }

  @Get('jour')
  @Permissions('caisse.view')
  jour(@Query() query: JourQueryDto) {
    return this.caisse.jour({ date: query.date });
  }

  @Post('ouvrir')
  @Permissions('caisse.open')
  ouvrir(
    @Body() dto: OuvrirCaisseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caisse.ouvrir(dto, user.id);
  }

  @Post('fermer')
  @Permissions('caisse.close')
  fermer(
    @Body() dto: FermerCaisseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caisse.fermer(dto, user.id);
  }

  @Post('fermer/:sessionId')
  @Permissions('caisse.close')
  fermerSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: FermerCaisseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caisse.fermer(dto, user.id, sessionId);
  }

  @Post('mouvements')
  @Permissions('caisse.close')
  mouvement(
    @Body() dto: MouvementCaisseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caisse.mouvement(dto, user.id);
  }
}