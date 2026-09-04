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
import { MarquesService } from './marques.service.js';
import { CreateMarqueDto } from './marques.service.js';

@Controller('marques')
export class MarquesController {
  constructor(private readonly marques: MarquesService) {}

  @Get()
  list() {
    return this.marques.list();
  }

  @Post()
  @Permissions('produits.edit')
  create(@Body() dto: CreateMarqueDto) {
    return this.marques.create(dto.nom);
  }

  @Patch(':id')
  @Permissions('produits.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMarqueDto,
  ) {
    return this.marques.update(id, dto.nom);
  }

  @Delete(':id')
  @Permissions('produits.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.marques.remove(id);
  }
}