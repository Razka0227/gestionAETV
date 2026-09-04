import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ModePaiement,
  Prisma,
  SensPaiement,
  StatutRetour,
  StatutVente,
  TypeMouvementStock,
  TypeRetour,
  TypeVente,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { generateNumero } from '../common/utils/refs.js';
import { startOfDayUTC } from '../common/utils/dates.js';
import {
  CreateVenteDto,
  CreerRetourDto,
  PaiementVenteDto,
} from './dto/vente.dto.js';

const MODES_ENC1 = new Set<ModePaiement>([
  ModePaiement.ESPECES,
  ModePaiement.CARTE,
  ModePaiement.VIREMENT,
  ModePaiement.MOBILE_MONEY,
]);

@Injectable()
export class VentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async numeroTicket(): Promise<string> {
    const start = startOfDayUTC();
    const rows = await this.prisma.vente.findMany({
      where: { date: { gte: start } },
      select: { numeroTicket: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = parseInt(r.numeroTicket.split('-').pop() ?? '0', 10) || 0;
      if (n > max) max = n;
    }
    return generateNumero('FV', max + 1);
  }

  async list(filters?: {
    dateDebut?: string;
    dateFin?: string;
    statut?: StatutVente;
    clientId?: number;
    caissierId?: number;
    search?: string;
    take?: number;
  }) {
    const where: Prisma.VenteWhereInput = {};
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.caissierId) where.utilisateurId = filters.caissierId;
    if (filters?.search) {
      where.numeroTicket = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters?.dateDebut || filters?.dateFin) {
      where.date = {
        ...(filters.dateDebut ? { gte: new Date(filters.dateDebut) } : {}),
        ...(filters.dateFin ? { lte: new Date(filters.dateFin) } : {}),
      };
    }
    return this.prisma.vente.findMany({
      where,
      include: {
        client: { select: { id: true, nom: true, prenom: true } },
        utilisateur: { select: { id: true, nom: true } },
        _count: { select: { lignes: true, retours: true } },
      },
      orderBy: { date: 'desc' },
      take: filters?.take ?? 100,
    });
  }

  async getById(id: number) {
    const v = await this.prisma.vente.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, nom: true, prenom: true, telephone: true } },
        utilisateur: { select: { id: true, nom: true } },
        lignes: {
          include: { produit: { select: { id: true, nom: true, reference: true, unite: true } } },
          orderBy: { id: 'asc' },
        },
        paiements: {
          include: { utilisateur: { select: { nom: true } } },
          orderBy: { date: 'desc' },
        },
        retours: { include: { lignes: true }, orderBy: { date: 'desc' } },
      },
    });
    if (!v) throw new NotFoundException('Vente introuvable');
    return v;
  }

  async create(dto: CreateVenteDto, userId: number) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Ajoutez au moins un article');
    }
    const params = await this.getParams();

    const lignesResume: {
      produitId: number;
      quantite: number;
      prixUnitaire: number;
      coutUnitaire: number;
      sousTotal: number;
      varianteDetail?: string | null;
    }[] = [];

    for (const it of dto.items) {
      const produit = await this.prisma.produit.findUnique({ where: { id: it.produitId } });
      if (!produit) throw new NotFoundException(`Produit introuvable (${it.produitId})`);
      if (produit.stock < it.quantite && params.venteNegative !== 'true') {
        throw new BadRequestException(
          `Stock insuffisant pour « ${produit.nom} » : ${produit.stock} disponible, ${it.quantite} demandé`,
        );
      }
      lignesResume.push({
        produitId: it.produitId,
        quantite: it.quantite,
        prixUnitaire: it.prixUnitaire,
        coutUnitaire: produit.prixAchat,
        sousTotal: it.prixUnitaire * it.quantite,
        varianteDetail: it.varianteDetail ?? null,
      });
    }

    const sousTotal = lignesResume.reduce((s, l) => s + l.sousTotal, 0);
    const remise = dto.remise ?? 0;
    if (remise > 0 && remise > sousTotal) {
      throw new BadRequestException('La remise ne peut pas dépasser le sous-total');
    }
    const maxRemise = Number(params.remiseMax ?? 10);
    if (
      (remise / sousTotal) * 100 > maxRemise
    ) {
      throw new BadRequestException(`Remise maximale autorisée : ${maxRemise}%`);
    }
    const taxe = 0;
    const total = sousTotal - remise;
    const mode = dto.modePaiement;

    const montantEncaisser =
      dto.montantEncaisser === undefined
        ? MODES_ENC1.has(mode)
          ? total
          : 0
        : Math.min(dto.montantEncaisser, total);
    const montantCredit = Math.max(0, total - montantEncaisser);
    const numero = await this.numeroTicket();

    const vente = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vente.create({
        data: {
          numeroTicket: numero,
          clientId: dto.clientId ?? null,
          utilisateurId: userId,
          date: dto.date ? new Date(dto.date) : undefined,
          typeVente: dto.typeVente ?? TypeVente.DETAIL,
          sousTotal,
          remise,
          taxe,
          total,
          modePaiement: dto.modePaiement,
          statut: StatutVente.VALIDEE,
          montantEncaisse: montantEncaisser,
          montantCredit: montantCredit,
          lignes: {
            create: lignesResume.map((l) => ({
              produitId: l.produitId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              coutUnitaire: l.coutUnitaire,
              sousTotal: l.sousTotal,
              varianteDetail: l.varianteDetail ?? null,
            })),
          },
        },
        include: { lignes: true },
      });

      if (montantEncaisser > 0) {
        await tx.paiement.create({
          data: {
            sens: SensPaiement.ENTREE,
            montant: montantEncaisser,
            mode: dto.modePaiement,
            reference: numero,
            utilisateurId: userId,
            venteId: created.id,
            clientId: dto.clientId ?? null,
          },
        });
      }

      for (const l of created.lignes) {
        await tx.produit.update({
          where: { id: l.produitId },
          data: { stock: { decrement: l.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: l.produitId,
            type: TypeMouvementStock.SORTIE_VENTE,
            quantite: -l.quantite,
            motif: null,
            reference: numero,
            utilisateurId: userId,
          },
        });
      }

      return created;
    });

    this.addFidelityPoints(dto.clientId, montantEncaisser).catch(() => void 0);

    await this.audit.log({
      utilisateurId: userId,
      action: 'VENTE_CREEE',
      entite: 'Vente',
      entiteId: vente.id,
      details: { numeroTicket: numero, total, credit: montantCredit },
    });

    return this.getById(vente.id);
  }

  async payer(id: number, dto: PaiementVenteDto, userId: number) {
    const v = await this.prisma.vente.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vente introuvable');
    if (v.statut !== StatutVente.VALIDEE) {
      throw new BadRequestException(`La vente est au statut ${v.statut} : encaissement impossible`);
    }
    if (v.montantCredit <= 0) {
      throw new BadRequestException('Cette vente est déjà soldée');
    }
    if (dto.montant > v.montantCredit) {
      throw new BadRequestException(
        `Le montant dépasse le crédit restant (${v.montantCredit} FCFA)`,
      );
    }
    const paiement = await this.prisma.paiement.create({
      data: {
        sens: SensPaiement.ENTREE,
        montant: dto.montant,
        mode: dto.mode ?? v.modePaiement,
        date: dto.date ? new Date(dto.date) : undefined,
        reference: `${v.numeroTicket} encaissement`,
        utilisateurId: userId,
        venteId: id,
        clientId: v.clientId,
      },
    });
    await this.prisma.vente.update({
      where: { id },
      data: {
        montantEncaisse: { increment: dto.montant },
        montantCredit: { decrement: dto.montant },
      },
    });
    if (v.clientId) {
      this.addFidelityPoints(v.clientId, dto.montant).catch(() => void 0);
    }
    await this.audit.log({
      utilisateurId: userId,
      action: 'VENTE_ENCAISSEE',
      entite: 'Vente',
      entiteId: id,
      details: { paiementId: paiement.id, montant: dto.montant },
    });
    return this.getById(id);
  }

  async annuler(id: number, userId: number) {
    const v = await this.prisma.vente.findUnique({
      where: { id },
      include: { lignes: true },
    });
    if (!v) throw new NotFoundException('Vente introuvable');
    if (v.statut !== StatutVente.VALIDEE) {
      throw new BadRequestException(
        'Seule une vente validée peut être annulée',
      );
    }
    const retours = await this.prisma.retour.count({
      where: { venteId: id, statut: StatutRetour.VALIDE },
    });
    if (retours > 0) {
      throw new BadRequestException(
        'Cette vente contient des retours : annulez‑les d’abord',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const l of v.lignes) {
        await tx.produit.update({
          where: { id: l.produitId },
          data: { stock: { increment: l.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: l.produitId,
            type: TypeMouvementStock.SORTIE_VENTE,
            quantite: l.quantite,
            motif: `Annulation ticket ${v.numeroTicket}`,
            reference: v.numeroTicket,
            utilisateurId: userId,
          },
        });
      }
      await tx.vente.update({ where: { id }, data: { statut: StatutVente.ANNULEE } });
      if (v.montantEncaisse > 0) {
        await tx.paiement.create({
          data: {
            sens: SensPaiement.SORTIE,
            montant: v.montantEncaisse,
            mode: v.modePaiement,
            reference: `Remboursement ${v.numeroTicket}`,
            utilisateurId: userId,
            venteId: id,
            clientId: v.clientId,
          },
        });
      }
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'VENTE_ANNULEE',
      entite: 'Vente',
      entiteId: id,
      details: { numeroTicket: v.numeroTicket },
    });
    return this.getById(id);
  }

  async retourner(id: number, dto: CreerRetourDto, userId: number) {
    const v = await this.prisma.vente.findUnique({
      where: { id },
      include: { lignes: true },
    });
    if (!v) throw new NotFoundException('Vente introuvable');
    if (v.statut !== StatutVente.VALIDEE) {
      throw new BadRequestException(
        'Seule une vente validée peut faire l’objet d’un retour',
      );
    }
    if (dto.lignes.length === 0) {
      throw new BadRequestException('Ajoutez au moins une ligne au retour');
    }

    const quantiteMax = new Map(v.lignes.map((l) => [l.produitId, l.quantite]));
    const lignes = dto.lignes.map((it) => {
      const max = quantiteMax.get(it.produitId) ?? 0;
      if (it.quantite > max) {
        throw new BadRequestException(
          `Quantité retournée supérieure à la quantité vendue pour ce produit`,
        );
      }
      return {
        produitId: it.produitId,
        quantite: it.quantite,
        prixUnitaire: it.prixUnitaire,
        sousTotal: it.prixUnitaire * it.quantite,
      };
    });
    const montant = lignes.reduce((s, l) => s + l.sousTotal, 0);

    const numeroRT = await generateRTNumero(this.prisma);

    const retour = await this.prisma.$transaction(async (tx) => {
      const r = await tx.retour.create({
        data: {
          numero: numeroRT,
          type: TypeRetour.VENTE,
          venteId: id,
          motif: dto.motif,
          montant,
          statut: StatutRetour.VALIDE,
          utilisateurId: userId,
          lignes: { create: lignes },
        },
      });
      for (const l of lignes) {
        await tx.produit.update({
          where: { id: l.produitId },
          data: { stock: { increment: l.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: l.produitId,
            type: TypeMouvementStock.RETOUR_VENTE,
            quantite: l.quantite,
            motif: dto.motif,
            reference: numeroRT,
            utilisateurId: userId,
          },
        });
      }
      await tx.vente.update({ where: { id }, data: { statut: StatutVente.RETOURNEE } });
      if (montant > 0) {
        await tx.paiement.create({
          data: {
            sens: SensPaiement.SORTIE,
            montant: montant,
            mode: v.modePaiement,
            reference: `Remboursement ${numeroRT}`,
            utilisateurId: userId,
            venteId: id,
            clientId: v.clientId,
          },
        });
      }
      return r;
    });

    await this.audit.log({
      utilisateurId: userId,
      action: 'VENTE_RETOURNEE',
      entite: 'Retour',
      entiteId: retour.id,
      details: { venteId: id, montant },
    });
    return this.getById(id);
  }

  private async getParams() {
    const rows = await this.prisma.parametre.findMany({
      where: { cle: { in: ['vente_negative', 'remise_max', 'programme_fidelite', 'points_par_1000'] } },
      select: { cle: true, valeur: true },
    });
    const map = new Map(rows.map((r) => [r.cle, r.valeur]));
    return {
      venteNegative: map.get('vente_negative') ?? 'false',
      remiseMax: map.get('remise_max') ?? '10',
      pointPar1000: Number(map.get('points_par_1000') ?? 1),
    };
  }

  private async addFidelityPoints(clientId: number | null | undefined, montant: number) {
    if (!clientId || montant <= 0) return;
    const fidelite = await this.prisma.parametre.findFirst({
      where: { cle: 'programme_fidelite' },
    });
    if (fidelite?.valeur !== 'true') return;
    const points = Math.floor(montant / (await this.pointsPer1000()));
    if (points > 0) {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { pointsFidelite: { increment: points } },
      });
    }
  }

  private async pointsPer1000(): Promise<number> {
    const p = await this.prisma.parametre.findUnique({
      where: { cle: 'points_par_1000' },
    });
    return Number(p?.valeur ?? 1);
  }
}

async function generateRTNumero(prisma: PrismaService): Promise<string> {
  const start = startOfDayUTC();
  const rows = await prisma.retour.findMany({
    where: { date: { gte: start } },
    select: { numero: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.numero.split('-').pop() ?? '0', 10) || 0;
    if (n > max) max = n;
  }
  return generateNumero('RT', max + 1);
}