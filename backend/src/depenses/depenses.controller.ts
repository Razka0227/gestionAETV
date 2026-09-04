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
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { DepensesService } from './depenses.service.js';
import {
  CreateCategorieDto,
  CreateDepenseDto,
} from './dto/depense.dto.js';

export class DepensesQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categorieId?: number;

  @IsOptional()
  dateDebut?: string;

  @IsOptional()
  dateFin?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  take?: number;
}

export class StatsQueryDto {
  @IsOptional()
  dateDebut?: string;

  @IsOptional()
  dateFin?: string;
}

@Controller('depenses')
export class DepensesController {
  constructor(private readonly depenses: DepensesService) {}

  @Get()
  @Permissions('depenses.view')
  list(@Query() query: DepensesQueryDto) {
    return this.depenses.list(query);
  }

  @Get('categories')
  @Permissions('depenses.view')
  categories() {
    return this.depenses.categories();
  }

  @Get('stats')
  @Permissions('depenses.view')
  stats(@Query() query: StatsQueryDto) {
    return this.depenses.stats(query);
  }

  @Post()
  @Permissions('depenses.create')
  create(
    @Body() dto: CreateDepenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depenses.create(dto, user.id);
  }

  @Post('categories')
  @Permissions('depenses.categories')
  createCategorie(@Body() dto: CreateCategorieDto) {
    return this.depenses.createCategorie(dto);
  }

  @Delete('categories/:id')
  @Permissions('depenses.categories')
  removeCategorie(@Param('id', ParseIntPipe) id: number) {
    return this.depenses.removeCategorie(id);
  }

  @Delete(':id')
  @Permissions('depenses.create')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depenses.remove(id, user.id);
  }
}