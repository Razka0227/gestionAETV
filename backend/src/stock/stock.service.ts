import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatutInventaire, TypeMouvementStock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AjustementStockDto, CreateInventaireDto } from './dto/stock.dto.js';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async etat(filters?: {
    search?: string;
    categorieId?: number;
    marqueId?: number;
    basStock?: boolean;
    rupture?: boolean;
    actif?: boolean;
  }) {
    const where: Prisma.ProduitWhereInput = { actif: filters?.actif ?? true };
    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { nom: { contains: s, mode: 'insensitive' } },
        { reference: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (filters?.categorieId) where.categorieId = filters.categorieId;
    if (filters?.marqueId) where.marqueId = filters.marqueId;
    if (filters?.rupture) where.stock = 0;

    const list = await this.prisma.produit.findMany({
      where,
      include: {
        categorie: { select: { id: true, nom: true } },
        marque: { select: { id: true, nom: true } },
      },
      orderBy: { nom: 'asc' },
    });

    return list
      .map((p) => ({
        id: p.id,
        nom: p.nom,
        reference: p.reference,
        categorie: p.categorie?.nom,
        marque: p.marque?.nom,
        stock: p.stock,
        stockMin: p.stockMin,
        unite: p.unite,
        emplacement: p.emplacement,
        valeurStock: p.stock * p.prixAchat,
      }))
      .filter((p) =>
        filters?.basStock ? p.stockMin > 0 && p.stock <= p.stockMin : true,
      );
  }

  async mouvements(filters?: {
    produitId?: number;
    type?: TypeMouvementStock;
    dateDebut?: string;
    dateFin?: string;
    take?: number;
  }) {
    const where: Prisma.MouvementStockWhereInput = {};
    if (filters?.produitId) where.produitId = filters.produitId;
    if (filters?.type) where.type = filters.type;
    if (filters?.dateDebut || filters?.dateFin) {
      where.date = {
        ...(filters.dateDebut ? { gte: new Date(filters.dateDebut) } : {}),
        ...(filters.dateFin ? { lte: new Date(filters.dateFin) } : {}),
      };
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.mouvementStock.findMany({
        where,
        include: {
          produit: { select: { id: true, nom: true, reference: true } },
          utilisateur: { select: { nom: true } },
        },
        orderBy: { date: 'desc' },
        take: filters?.take ?? 200,
      }),
      this.prisma.mouvementStock.count({ where }),
    ]);
    return { rows, total };
  }

  async ajuster(dto: AjustementStockDto, userId: number) {
    const produit = await this.prisma.produit.findUnique({
      where: { id: dto.produitId },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');
    if (dto.quantite === 0) {
      throw new BadRequestException('La quantité ajustée ne peut pas être nulle');
    }
    const type = dto.type;
    if (type === TypeMouvementStock.PERTE && dto.quantite > 0) {
      throw new BadRequestException('Une perte doit avoir une quantité négative');
    }
    if (
      type === TypeMouvementStock.AJUSTEMENT ||
      type === TypeMouvementStock.PERTE ||
      type === TypeMouvementStock.TRANSFERT
    ) {
      if (!dto.motif?.trim()) {
        throw new BadRequestException('Un motif est requis pour cet ajustement');
      }
    }

    const nouveauStock = produit.stock + dto.quantite;
    if (nouveauStock < 0) {
      throw new BadRequestException(
        `Stock insuffisant : ${produit.stock} disponible, ${-dto.quantite} demandé`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.produit.update({
        where: { id: produit.id },
        data: { stock: nouveauStock },
      });
      await tx.mouvementStock.create({
        data: {
          produitId: produit.id,
          type,
          quantite: dto.quantite,
          motif: dto.motif.trim(),
          reference: dto.reference ?? null,
          utilisateurId: userId,
        },
      });
    });

    await this.audit.log({
      utilisateurId: userId,
      action: 'STOCK_AJUSTE',
      entite: 'MouvementStock',
      entiteId: produit.id,
      details: { type, quantite: dto.quantite, motif: dto.motif },
    });
    return { ok: true, produitId: produit.id, stock: nouveauStock };
  }

  async inventaires() {
    const rows = await this.prisma.inventaire.findMany({
      include: {
        utilisateur: { select: { nom: true } },
        _count: { select: { lignes: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return Promise.all(
      rows.map(async (r) => {
        const totalEcarts = await this.prisma.inventaireLigne.aggregate({
          where: { inventaireId: r.id },
          _sum: { ecart: true },
        });
        return { ...r, ecartNet: totalEcarts._sum.ecart ?? 0 };
      }),
    );
  }

  async inventaire(id: number) {
    const inv = await this.prisma.inventaire.findUnique({
      where: { id },
      include: {
        utilisateur: { select: { nom: true } },
        lignes: {
          include: { produit: { select: { id: true, nom: true, reference: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!inv) throw new NotFoundException('Inventaire introuvable');
    return inv;
  }

  async createInventaire(dto: CreateInventaireDto, userId: number) {
    const produits = await this.prisma.produit.findMany({
      where: { actif: true },
      select: { id: true, nom: true, stock: true },
      orderBy: { nom: 'asc' },
    });
    const saisis = new Map((dto.lignes ?? []).map((l) => [l.produitId, l.qteReelle]));

    const lignes = produits.map((p) => {
      const qteReelle = saisis.get(p.id) ?? p.stock;
      return {
        produitId: p.id,
        qteTheorique: p.stock,
        qteReelle,
        ecart: qteReelle - p.stock,
      };
    });

    const inv = await this.prisma.inventaire.create({
      data: {
        utilisateurId: userId,
        lignes: { create: lignes },
      },
      include: { lignes: true },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'INVENTAIRE_CREE',
      entite: 'Inventaire',
      entiteId: inv.id,
      details: { lignes: lignes.length },
    });
    return inv;
  }

  async validerInventaire(id: number, userId: number) {
    const inv = await this.prisma.inventaire.findUnique({
      where: { id },
      include: { lignes: true },
    });
    if (!inv) throw new NotFoundException('Inventaire introuvable');
    if (inv.statut === StatutInventaire.VALIDE) {
      throw new BadRequestException('Inventaire déjà validé');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const ligne of inv.lignes) {
        if (ligne.ecart === 0) continue;
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stock: { increment: ligne.ecart } },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: ligne.produitId,
            type: TypeMouvementStock.INVENTAIRE,
            quantite: ligne.ecart,
            motif: `Validation inventaire n°${id}`,
            reference: `INV-${id}`,
            utilisateurId: userId,
          },
        });
      }
      await tx.inventaire.update({ where: { id }, data: { statut: StatutInventaire.VALIDE } });
    });

    await this.audit.log({
      utilisateurId: userId,
      action: 'INVENTAIRE_VALIDE',
      entite: 'Inventaire',
      entiteId: id,
      details: { lignes: inv.lignes.length },
    });
    return this.inventaire(id);
  }
}