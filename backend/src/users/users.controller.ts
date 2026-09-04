import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Permissions('admin.users')
  list(@Query('role') role?: Role, @Query('actif') actif?: string) {
    return this.users.list({
      role,
      actif: actif === undefined ? undefined : actif === 'true',
    });
  }

  @Get(':id')
  @Permissions('admin.users')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.users.getById(id);
  }

  @Post()
  @Permissions('admin.users')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @Permissions('admin.users')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Permissions('admin.users')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.users.deactivate(id);
  }
}