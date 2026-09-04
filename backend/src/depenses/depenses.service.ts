import { Injectable, NotFoundException } from '@nestjs/common';
import { ModePaiement, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { startOfMonthUTC } from '../common/utils/dates.js';
import { CreateDepenseDto, CreateCategorieDto } from './dto/depense.dto.js';

@Injectable()
export class DepensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async categories() {
    const rows = await this.prisma.depenseCategorie.findMany({
      include: { _count: { select: { depenses: true } } },
      orderBy: { nom: 'asc' },
    });
    return rows.map(({ _count, ...c }) => ({
      ...c,
      totalDepenses: _count.depenses,
    }));
  }

  async list(filters?: {
    categorieId?: number;
    dateDebut?: string;
    dateFin?: string;
    search?: string;
    take?: number;
  }) {
    const where: Prisma.DepenseWhereInput = {};
    if (filters?.categorieId) where.categorieId = filters.categorieId;
    if (filters?.search) {
      where.description = {
        contains: filters.search.trim(),
        mode: 'insensitive',
      };
    }
    if (filters?.dateDebut || filters?.dateFin) {
      where.date = {
        ...(filters.dateDebut ? { gte: new Date(filters.dateDebut) } : {}),
        ...(filters.dateFin ? { lte: new Date(filters.dateFin) } : {}),
      };
    }
    const rows = await this.prisma.depense.findMany({
      where,
      include: {
        categorie: { select: { id: true, nom: true } },
        utilisateur: { select: { id: true, nom: true } },
      },
      orderBy: { date: 'desc' },
      take: filters?.take ?? 100,
    });
    const total = rows.reduce((s, d) => s + d.montant, 0);
    return { liste: rows, total };
  }

  async create(dto: CreateDepenseDto, userId: number) {
    const cat = await this.prisma.depenseCategorie.findUnique({
      where: { id: dto.categorieId },
    });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    const depense = await this.prisma.depense.create({
      data: {
        categorieId: dto.categorieId,
        montant: dto.montant,
        description: dto.description ?? null,
        date: dto.date ? new Date(dto.date) : undefined,
        modePaiement: dto.modePaiement ?? ModePaiement.ESPECES,
        utilisateurId: userId,
      },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'DEPENSE_CREEE',
      entite: 'Depense',
      entiteId: depense.id,
      details: {
        montant: depense.montant,
        categorie: cat.nom,
        description: dto.description,
      },
    });
    return depense;
  }

  async createCategorie(dto: CreateCategorieDto) {
    return this.prisma.depenseCategorie.create({ data: { nom: dto.nom.trim() } });
  }

  async removeCategorie(id: number) {
    const c = await this.prisma.depenseCategorie.findUnique({
      where: { id },
      include: { _count: { select: { depenses: true } } },
    });
    if (!c) throw new NotFoundException('Catégorie introuvable');
    if (c._count.depenses > 0) {
      throw new NotFoundException(
        'Impossible de supprimer : des dépenses sont liées à cette catégorie',
      );
    }
    return this.prisma.depenseCategorie.delete({ where: { id } });
  }

  async remove(id: number, userId: number) {
    const d = await this.prisma.depense.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Dépense introuvable');
    await this.prisma.depense.delete({ where: { id } });
    await this.audit.log({
      utilisateurId: userId,
      action: 'DEPENSE_SUPPRIMEE',
      entite: 'Depense',
      entiteId: id,
      details: { montant: d.montant },
    });
    return { ok: true };
  }

  async stats(filters?: { dateDebut?: string; dateFin?: string }) {
    const debut = filters?.dateDebut
      ? new Date(filters.dateDebut)
      : startOfMonthUTC();
    const fin = filters?.dateFin ? new Date(filters.dateFin) : new Date();
    const rows = await this.prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { montant: true, categorie: { select: { nom: true } } },
    });
    const total = rows.reduce((s, d) => s + d.montant, 0);
    const parCategorie = new Map<string, number>();
    for (const d of rows) {
      const nom = d.categorie.nom;
      parCategorie.set(nom, (parCategorie.get(nom) ?? 0) + d.montant);
    }
    return {
      total,
      parCategorie: Array.from(parCategorie.entries()).map(([nom, montant]) => ({
        nom,
        montant,
      })),
    };
  }
}