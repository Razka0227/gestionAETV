import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateFournisseurDto,
  UpdateFournisseurDto,
} from './dto/fournisseur.dto.js';

@Injectable()
export class FournisseursService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.fournisseur.findMany({
      include: {
        _count: { select: { commandes: true } },
        paiements: { select: { montant: true } },
      },
      orderBy: { nom: 'asc' },
    });
    // Dette = total commandes (RECUES/ENVOYEES) - paiements effectués.
    return Promise.all(
      rows.map(async (f) => {
        let totalCommandes = 0;
        const commandes = await this.prisma.commandeAchat.findMany({
          where: { fournisseurId: f.id },
          select: { totalTtc: true },
        });
        totalCommandes = commandes.reduce((s, c) => s + c.totalTtc, 0);
        const paye = f.paiements.reduce((s, p) => s + p.montant, 0);
        const { paiements: _paiements, ...rest } = f;
        return {
          ...rest,
          totalAchats: totalCommandes,
          totalPaye: paye,
          dette: Math.max(0, totalCommandes - paye),
        };
      }),
    );
  }

  async getById(id: number) {
    const fournisseur = await this.prisma.fournisseur.findUnique({
      where: { id },
      include: {
        commandes: {
          orderBy: { date: 'desc' },
          take: 50,
          include: {
            _count: { select: { lignes: true } },
            paiements: { select: { montant: true } },
          },
        },
        paiements: { orderBy: { date: 'desc' }, take: 50 },
      },
    });
    if (!fournisseur) throw new NotFoundException('Fournisseur introuvable');
    return fournisseur;
  }

  create(dto: CreateFournisseurDto) {
    return this.prisma.fournisseur.create({ data: dto });
  }

  async update(id: number, dto: UpdateFournisseurDto) {
    await this.ensure(id);
    return this.prisma.fournisseur.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const f = await this.prisma.fournisseur.findUnique({
      where: { id },
      include: { _count: { select: { commandes: true } } },
    });
    if (!f) throw new NotFoundException('Fournisseur introuvable');
    if (f._count.commandes > 0) {
      throw new ConflictException(
        'Impossible de supprimer : des commandes sont liées à ce fournisseur',
      );
    }
    await this.prisma.fournisseur.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: number) {
    const f = await this.prisma.fournisseur.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Fournisseur introuvable');
  }
}