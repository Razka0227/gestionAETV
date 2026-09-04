import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    utilisateurId?: number | null;
    action: string;
    entite: string;
    entiteId?: number | null;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        utilisateurId: params.utilisateurId ?? null,
        action: params.action,
        entite: params.entite,
        entiteId: params.entiteId ?? null,
        details: params.details
          ? (params.details as unknown as object)
          : undefined,
      },
    });
  }

  async list(filters?: {
    entite?: string;
    utilisateurId?: number;
    limit?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        entite: filters?.entite,
        utilisateurId: filters?.utilisateurId,
      },
      include: {
        utilisateur: { select: { id: true, nom: true, email: true, role: true } },
      },
      orderBy: { date: 'desc' },
      take: filters?.limit ?? 200,
    });
  }
}