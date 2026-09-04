import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { FournisseursService } from './fournisseurs.service.js';
import {
  CreateFournisseurDto,
  UpdateFournisseurDto,
} from './dto/fournisseur.dto.js';

@Controller('fournisseurs')
export class FournisseursController {
  constructor(private readonly fournisseurs: FournisseursService) {}

  @Get()
  @Permissions('fournisseurs.view')
  list() {
    return this.fournisseurs.list();
  }

  @Get(':id')
  @Permissions('fournisseurs.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.fournisseurs.getById(id);
  }

  @Post()
  @Permissions('fournisseurs.create')
  create(@Body() dto: CreateFournisseurDto) {
    return this.fournisseurs.create(dto);
  }

  @Patch(':id')
  @Permissions('fournisseurs.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFournisseurDto,
  ) {
    return this.fournisseurs.update(id, dto);
  }

  @Delete(':id')
  @Permissions('fournisseurs.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fournisseurs.remove(id);
  }
}