import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions('admin.audit')
  list(
    @Query('entite') entite?: string,
    @Query('utilisateur') utilisateurId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list({
      entite,
      utilisateurId: utilisateurId ? Number(utilisateurId) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}