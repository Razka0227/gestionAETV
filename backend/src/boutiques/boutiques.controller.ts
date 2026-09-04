import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { BoutiquesService } from './boutiques.service.js';
import {
  CreateBoutiqueDto,
  UpdateBoutiqueDto,
} from './dto/boutique.dto.js';

@Controller('boutiques')
export class BoutiquesController {
  constructor(private readonly boutiques: BoutiquesService) {}

  @Get()
  list() {
    return this.boutiques.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.boutiques.getById(id);
  }

  @Post()
  @Permissions('admin.boutiques')
  create(@Body() dto: CreateBoutiqueDto) {
    return this.boutiques.create(dto);
  }

  @Patch(':id')
  @Permissions('admin.boutiques')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoutiqueDto,
  ) {
    return this.boutiques.update(id, dto);
  }
}