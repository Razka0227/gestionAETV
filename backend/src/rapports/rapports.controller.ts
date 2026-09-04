import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { RapportsService } from './rapports.service.js';

class PeriodeQueryDto {
  @IsOptional()
  dateDebut?: string;

  @IsOptional()
  dateFin?: string;
}

class TopQueryDto extends PeriodeQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  take?: number;
}

@Controller('rapports')
export class RapportsController {
  constructor(private readonly rapports: RapportsService) {}

  @Get('overview')
  @Permissions('rapports.voir')
  overview(@Query() query: PeriodeQueryDto) {
    return this.rapports.overview(query);
  }

  @Get('ventes')
  @Permissions('rapports.voir')
  ventes(@Query() query: PeriodeQueryDto) {
    return this.rapports.ventes(query);
  }

  @Get('ventes/produits')
  @Permissions('rapports.voir')
  produits(@Query() query: TopQueryDto) {
    return this.rapports.produits(query, query.take ?? 10);
  }

  @Get('ventes/categories')
  @Permissions('rapports.voir')
  categories(@Query() query: PeriodeQueryDto) {
    return this.rapports.categories(query);
  }

  @Get('ventes/marques')
  @Permissions('rapports.voir')
  marques(@Query() query: PeriodeQueryDto) {
    return this.rapports.marques(query);
  }

  @Get('ventes/clients')
  @Permissions('rapports.voir')
  clients(@Query() query: TopQueryDto) {
    return this.rapports.clients(query, query.take ?? 10);
  }

  @Get('achats')
  @Permissions('rapports.voir')
  achats(@Query() query: PeriodeQueryDto) {
    return this.rapports.achats(query);
  }

  @Get('stock')
  @Permissions('rapports.voir')
  stock() {
    return this.rapports.stock();
  }
}