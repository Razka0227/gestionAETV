import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { StatutVente } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { VentesService } from './ventes.service.js';
import {
  CreateVenteDto,
  CreerRetourDto,
  PaiementVenteDto,
} from './dto/vente.dto.js';

export class VentesQueryDto {
  @IsOptional()
  dateDebut?: string;

  @IsOptional()
  dateFin?: string;

  @IsOptional()
  @IsEnum(StatutVente)
  statut?: StatutVente;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  clientId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  caissierId?: number;

  @IsOptional()
  search?: string;
}

@Controller('ventes')
export class VentesController {
  constructor(private readonly ventes: VentesService) {}

  @Get()
  @Permissions('ventes.view')
  list(@Query() query: VentesQueryDto) {
    return this.ventes.list({
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      statut: query.statut,
      clientId: query.clientId,
      caissierId: query.caissierId,
      search: query.search,
    });
  }

  @Get(':id')
  @Permissions('ventes.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.ventes.getById(id);
  }

  @Post()
  @Permissions('ventes.create')
  create(
    @Body() dto: CreateVenteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventes.create(dto, user.id);
  }

  @Post(':id/paiements')
  @Permissions('ventes.encaisser')
  payer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaiementVenteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventes.payer(id, dto, user.id);
  }

  @Post(':id/annuler')
  @Permissions('ventes.annuler')
  annuler(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventes.annuler(id, user.id);
  }

  @Post(':id/retours')
  @Permissions('ventes.retourner')
  retourner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreerRetourDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventes.retourner(id, dto, user.id);
  }
}