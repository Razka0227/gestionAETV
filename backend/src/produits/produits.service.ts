import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { pad } from '../common/utils/refs.js';
import {
  CreateLotDto,
  CreateProduitDto,
  UpdateLotDto,
  UpdateProduitDto,
} from './dto/produit.dto.js';

@Injectable()
export class ProduitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async nextReference(): Promise<string> {
    const last = await this.prisma.produit.findFirst({
      orderBy: { id: 'desc' },
      select: { reference: true },
    });
    const num = last ? parseInt(last.reference.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    return `REF-${pad(num + 1, 4)}`;
  }

  async list(filters?: {
    search?: string;
    categorieId?: number;
    marqueId?: number;
    actif?: boolean;
    basStock?: boolean;
    take?: number;
  }) {
    const where: Prisma.ProduitWhereInput = {
      actif: filters?.actif,
    };

    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { nom: { contains: s, mode: 'insensitive' } },
        { reference: { contains: s, mode: 'insensitive' } },
        { codeBarre: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (filters?.categorieId) {
      // inclut les produits des sous-catégories
      const subs = await this.prisma.categorie.findMany({
        where: { parentId: filters.categorieId },
        select: { id: true },
      });
      where.categorieId = { in: [filters.categorieId, ...subs.map((s) => s.id)] };
    }
    if (filters?.marqueId) where.marqueId = filters.marqueId;

    let take = filters?.take ?? 100;
    let lowIds: number[] | null = null;
    if (filters?.basStock) {
      const rows = await this.prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM produits
        WHERE actif = true AND "stockMin" > 0 AND stock <= "stockMin"
        ORDER BY stock ASC
        LIMIT ${take};
      `;
      lowIds = rows.map((r) => Number(r.id));
      if (lowIds.length === 0) return [];
      where.id = { in: lowIds };
      take = lowIds.length;
    }

    return this.prisma.produit.findMany({
      where,
      include: {
        categorie: { select: { id: true, nom: true, parent: { select: { nom: true } } } },
        marque: { select: { id: true, nom: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  async getById(id: number) {
    const produit = await this.prisma.produit.findUnique({
      where: { id },
      include: {
        categorie: { select: { id: true, nom: true, parentId: true } },
        marque: { select: { id: true, nom: true } },
        variantes: { orderBy: { id: 'asc' } },
        lots: { orderBy: { datePeremption: 'asc' } },
        mouvementsStock: { orderBy: { date: 'desc' }, take: 30 },
      },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');
    return produit;
  }

  async create(dto: CreateProduitDto, userId: number) {
    const codeBarre = dto.codeBarre?.trim() || null;
    if (codeBarre) {
      const dup = await this.prisma.produit.findFirst({
        where: { codeBarre },
      });
      if (dup) {
        throw new ConflictException('Ce code-barres est déjà attribué à un autre produit');
      }
    }
    const reference = dto.reference?.trim() || (await this.nextReference());
    const conflictRef = await this.prisma.produit.findUnique({
      where: { reference },
    });
    if (conflictRef) {
      throw new ConflictException('Cette référence existe déjà');
    }

    const produit = await this.prisma.produit.create({
      data: {
        categorieId: dto.categorieId,
        marqueId: dto.marqueId ?? null,
        reference,
        codeBarre,
        nom: dto.nom,
        description: dto.description,
        image: dto.image,
        unite: dto.unite ?? 'pièce',
        prixAchat: dto.prixAchat,
        prixVente: dto.prixVente,
        prixGros: dto.prixGros ?? null,
        prixPromo: dto.prixPromo ?? null,
        stockMin: dto.stockMin ?? 0,
        emplacement: dto.emplacement,
        suitLots: dto.suitLots ?? false,
        variantes: dto.variantes?.length
          ? { create: dto.variantes }
          : undefined,
      },
    });

    await this.audit.log({
      utilisateurId: userId,
      action: 'PRODUIT_CREE',
      entite: 'Produit',
      entiteId: produit.id,
      details: { reference: produit.reference, nom: produit.nom },
    });
    return this.getById(produit.id);
  }

  async update(id: number, dto: UpdateProduitDto, userId: number) {
    const produit = await this.prisma.produit.findUnique({
      where: { id },
      include: { variantes: true },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');

    if (dto.reference) {
      const dup = await this.prisma.produit.findFirst({
        where: { reference: dto.reference, id: { not: id } },
      });
      if (dup) throw new ConflictException('Cette référence est déjà utilisée');
    }
    if (dto.codeBarre) {
      const dup = await this.prisma.produit.findFirst({
        where: { codeBarre: dto.codeBarre, id: { not: id } },
      });
      if (dup) throw new ConflictException('Ce code-barres est déjà utilisé');
    }

    const data: Prisma.ProduitUpdateInput = {};
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.categorieId !== undefined) data.categorie = { connect: { id: dto.categorieId } };
    if (dto.marqueId !== undefined) {
      data.marque =
        dto.marqueId === null ? { disconnect: true } : { connect: { id: dto.marqueId } };
    }
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.codeBarre !== undefined) data.codeBarre = dto.codeBarre?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.unite !== undefined) data.unite = dto.unite;
    if (dto.prixAchat !== undefined) data.prixAchat = dto.prixAchat;
    if (dto.prixVente !== undefined) data.prixVente = dto.prixVente;
    if (dto.prixGros !== undefined) data.prixGros = dto.prixGros;
    if (dto.prixPromo !== undefined) data.prixPromo = dto.prixPromo;
    if (dto.stockMin !== undefined) data.stockMin = dto.stockMin;
    if (dto.emplacement !== undefined) data.emplacement = dto.emplacement;
    if (dto.suitLots !== undefined) data.suitLots = dto.suitLots;
    if (dto.actif !== undefined) data.actif = dto.actif;

    // Remplace les variantes si un tableau est fourni.
    if (dto.variantes) {
      data.variantes = {
        deleteMany: {},
        create: dto.variantes,
      };
    }

    const updated = await this.prisma.produit.update({ where: { id }, data });
    await this.audit.log({
      utilisateurId: userId,
      action: 'PRODUIT_MODIFIE',
      entite: 'Produit',
      entiteId: id,
      details: { changes: Object.keys(dto) },
    });
    return this.getById(updated.id);
  }

  async addVariante(produitId: number, dto: { nomOption: string; valeur: string; prixAjustement?: number }) {
    await this.ensureProduit(produitId);
    return this.prisma.produitVariante.create({
      data: { produitId, ...dto, prixAjustement: dto.prixAjustement ?? 0 },
    });
  }

  async removeVariante(produitId: number, varianteId: number) {
    await this.prisma.produitVariante.deleteMany({
      where: { id: varianteId, produitId },
    });
    return { ok: true };
  }

  async addLot(produitId: number, dto: CreateLotDto) {
    await this.ensureProduit(produitId);
    return this.prisma.lot.create({
      data: {
        produitId,
        numero: dto.numero,
        datePeremption: dto.datePeremption ? new Date(dto.datePeremption) : null,
        quantite: dto.quantite ?? 0,
      },
    });
  }

  async updateLot(lotId: number, dto: UpdateLotDto) {
    const lot = await this.prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) throw new NotFoundException('Lot introuvable');
    return this.prisma.lot.update({
      where: { id: lotId },
      data: {
        numero: dto.numero,
        quantite: dto.quantite,
        datePeremption: dto.datePeremption ? new Date(dto.datePeremption) : lot.datePeremption,
      },
    });
  }

  async removeLot(lotId: number) {
    await this.prisma.lot.delete({ where: { id: lotId } });
    return { ok: true };
  }

  private async ensureProduit(id: number) {
    const p = await this.prisma.produit.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Produit introuvable');
    return p;
  }
}