import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { ProduitsService } from './produits.service.js';
import {
  CreateProduitDto,
  UpdateProduitDto,
} from './dto/produit.dto.js';

export class ProduitQueryDto {
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
  actif?: string;

  @IsOptional()
  @IsBooleanString()
  basStock?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  take?: number;
}

@Controller('produits')
export class ProduitsController {
  constructor(private readonly produits: ProduitsService) {}

  @Get()
  @Permissions('produits.view')
  list(@Query() query: ProduitQueryDto) {
    return this.produits.list({
      search: query.search,
      categorieId: query.categorieId,
      marqueId: query.marqueId,
      actif: query.actif === undefined ? undefined : query.actif === 'true',
      basStock: query.basStock === 'true',
      take: query.take,
    });
  }

  @Get(':id')
  @Permissions('produits.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.produits.getById(id);
  }

  @Post()
  @Permissions('produits.create')
  create(
    @Body() dto: CreateProduitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.produits.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('produits.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProduitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.produits.update(id, dto, user.id);
  }

  @Post(':id/variantes')
  @Permissions('produits.edit')
  addVariante(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { nomOption: string; valeur: string; prixAjustement?: number },
  ) {
    return this.produits.addVariante(id, dto);
  }

  @Delete(':id/variantes/:vid')
  @Permissions('produits.edit')
  removeVariante(
    @Param('id', ParseIntPipe) id: number,
    @Param('vid', ParseIntPipe) vid: number,
  ) {
    return this.produits.removeVariante(id, vid);
  }

  @Post(':id/lots')
  @Permissions('produits.edit')
  addLot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { numero: string; datePeremption?: string; quantite?: number },
  ) {
    return this.produits.addLot(id, dto);
  }

  @Patch(':id/lots/:lotId')
  @Permissions('produits.edit')
  updateLot(
    @Param('lotId', ParseIntPipe) lotId: number,
    @Body() dto: { numero?: string; datePeremption?: string; quantite?: number },
  ) {
    return this.produits.updateLot(lotId, dto);
  }

  @Delete(':id/lots/:lotId')
  @Permissions('produits.edit')
  removeLot(
    @Param('id', ParseIntPipe) _id: number,
    @Param('lotId', ParseIntPipe) lotId: number,
  ) {
    return this.produits.removeLot(lotId);
  }
}