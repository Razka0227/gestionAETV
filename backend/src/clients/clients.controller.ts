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
import { IsOptional } from 'class-validator';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { ClientsService } from './clients.service.js';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto.js';

class ClientQueryDto {
  @IsOptional()
  search?: string;
}

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @Permissions('clients.view')
  list(@Query() query: ClientQueryDto) {
    return this.clients.list({ search: query.search });
  }

  @Get(':id')
  @Permissions('clients.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.clients.getById(id);
  }

  @Post()
  @Permissions('clients.create')
  create(@Body() dto: CreateClientDto) {
    return this.clients.create(dto);
  }

  @Patch(':id')
  @Permissions('clients.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  @Permissions('clients.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clients.remove(id);
  }
}