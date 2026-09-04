import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { StatutCommande } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { AchatsService } from './achats.service.js';
import {
  CommandeLigneDto,
  CreateCommandeAchatDto,
  PaiementCommandeDto,
  ReceptionCommandeDto,
} from './dto/achat.dto.js';

export class AchatQueryDto {
  @IsOptional()
  @IsEnum(StatutCommande)
  statut?: StatutCommande;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  fournisseurId?: number;

  @IsOptional()
  search?: string;

  @IsOptional()
  dateDebut?: string;

  @IsOptional()
  dateFin?: string;
}

@Controller('achats')
export class AchatsController {
  constructor(private readonly achats: AchatsService) {}

  @Get('dettes')
  @Permissions('achats.view', 'fournisseurs.view')
  suiviDettes() {
    return this.achats.suiviDettes();
  }

  @Get()
  @Permissions('achats.view')
  list(@Query() query: AchatQueryDto) {
    return this.achats.list({
      statut: query.statut,
      fournisseurId: query.fournisseurId,
      search: query.search,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
    });
  }

  @Get(':id')
  @Permissions('achats.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.achats.getById(id);
  }

  @Post()
  @Permissions('achats.create')
  create(
    @Body() dto: CreateCommandeAchatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.create(dto, user.id);
  }

  @Post(':id/lignes')
  @Permissions('achats.create')
  addLigne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommandeLigneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.addLigne(id, dto, user.id);
  }

  @Delete(':id/lignes/:ligneId')
  @Permissions('achats.create')
  removeLigne(
    @Param('id', ParseIntPipe) id: number,
    @Param('ligneId', ParseIntPipe) ligneId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.removeLigne(id, ligneId, user.id);
  }

  @Post(':id/valider')
  @Permissions('achats.create')
  valider(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.valider(id, user.id);
  }

  @Post(':id/receptionner')
  @Permissions('achats.receive')
  receptionner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceptionCommandeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.receptionner(id, dto, user.id);
  }

  @Post(':id/paiements')
  @Permissions('achats.pay')
  payer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaiementCommandeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.payer(id, dto, user.id);
  }

  @Post(':id/annuler')
  @Permissions('achats.create')
  annuler(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.achats.annuler(id, user.id);
  }
}