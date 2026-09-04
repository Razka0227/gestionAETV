import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { TypeMouvementStock } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBooleanString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { StockService } from './stock.service.js';
import { AjustementStockDto, CreateInventaireDto } from './dto/stock.dto.js';

export class EtatQueryDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categorieId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  marqueId?: number;

  @IsOptional()
  @IsBooleanString()
  basStock?: string;

  @IsOptional()
  @IsBooleanString()
  rupture?: string;
}

export class MouvementsQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  produitId?: number;

  @IsOptional()
  @IsEnum(TypeMouvementStock)
  type?: TypeMouvementStock;

  @IsOptional()
  dateDebut?: string;

  @IsOptional()
  dateFin?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  take?: number;
}

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('etat')
  @Permissions('stock.view')
  etat(@Query() query: EtatQueryDto) {
    return this.stock.etat({
      search: query.search,
      categorieId: query.categorieId,
      marqueId: query.marqueId,
      basStock: query.basStock === 'true',
      rupture: query.rupture === 'true',
    });
  }

  @Get('mouvements')
  @Permissions('stock.mouvements')
  mouvements(@Query() query: MouvementsQueryDto) {
    return this.stock.mouvements({
      produitId: query.produitId,
      type: query.type,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      take: query.take,
    });
  }

  @Post('ajustements')
  @Permissions('stock.ajuster')
  ajuster(
    @Body() dto: AjustementStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stock.ajuster(dto, user.id);
  }

  @Get('inventaires')
  @Permissions('stock.inventaire')
  inventaires() {
    return this.stock.inventaires();
  }

  @Get('inventaires/:id')
  @Permissions('stock.inventaire')
  inventaire(@Param('id', ParseIntPipe) id: number) {
    return this.stock.inventaire(id);
  }

  @Post('inventaires')
  @Permissions('stock.inventaire')
  createInventaire(
    @Body() dto: CreateInventaireDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stock.createInventaire(dto, user.id);
  }

  @Post('inventaires/:id/valider')
  @Permissions('stock.inventaire')
  validerInventaire(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stock.validerInventaire(id, user.id);
  }
}