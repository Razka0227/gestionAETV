import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { ParametresService } from './parametres.service.js';

@Controller('parametres')
export class ParametresController {
  constructor(private readonly parametres: ParametresService) {}

  @Get()
  getAll() {
    return this.parametres.getAll();
  }

  @Patch()
  @Permissions('admin.parametres')
  update(@Body() body: Record<string, string>) {
    const result: Record<string, unknown> = {};
    return Promise.all(
      Object.entries(body).map(async ([cle, valeur]) => {
        await this.parametres.set(cle, String(valeur));
        result[cle] = String(valeur);
      }),
    ).then(() => result);
  }
}