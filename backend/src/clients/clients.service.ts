import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatutVente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters?: { search?: string }) {
    const where: Prisma.ClientWhereInput = {};
    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { nom: { contains: s, mode: 'insensitive' } },
        { prenom: { contains: s, mode: 'insensitive' } },
        { telephone: { contains: s, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.client.findMany({
      where,
      include: {
        ventes: {
          where: { statut: { notIn: [StatutVente.ANNULEE, StatutVente.RETOURNEE] } },
          select: { montantCredit: true, total: true },
        },
      },
      orderBy: { nom: 'asc' },
      take: 200,
    });
    return rows.map(({ ventes, ...c }) => ({
      ...c,
      nVentes: ventes.length,
      totalAchats: ventes.reduce((s, v) => s + v.total, 0),
      credit: ventes.reduce((s, v) => s + v.montantCredit, 0),
    }));
  }

  async getById(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        ventes: {
          orderBy: { date: 'desc' },
          take: 50,
          include: {
            utilisateur: { select: { nom: true } },
            _count: { select: { lignes: true } },
          },
        },
        paiements: { orderBy: { date: 'desc' }, take: 50 },
      },
    });
    if (!client) throw new NotFoundException('Client introuvable');
    const credit = client.ventes.reduce((s, v) => s + v.montantCredit, 0);
    return { ...client, credit };
  }

  create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  async update(id: number, dto: UpdateClientDto) {
    const c = await this.prisma.client.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Client introuvable');
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const c = await this.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { ventes: true } } },
    });
    if (!c) throw new NotFoundException('Client introuvable');
    if (c._count.ventes > 0) {
      throw new ConflictException(
        'Impossible de supprimer : des ventes sont liées à ce client',
      );
    }
    await this.prisma.client.delete({ where: { id } });
    return { ok: true };
  }
}