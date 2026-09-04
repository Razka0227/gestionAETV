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
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CategoriesService } from './categories.service.js';
import {
  CreateCategorieDto,
  UpdateCategorieDto,
} from './dto/categorie.dto.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query('tree') tree?: string) {
    return tree === 'true' ? this.categories.tree() : this.categories.list();
  }

  @Post()
  @Permissions('produits.edit')
  create(@Body() dto: CreateCategorieDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @Permissions('produits.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategorieDto,
  ) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @Permissions('produits.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}