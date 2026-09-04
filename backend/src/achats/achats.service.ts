import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommandeAchat,
  Prisma,
  SensPaiement,
  StatutCommande,
  TypeMouvementStock,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { generateNumero } from '../common/utils/refs.js';
import { startOfDayUTC } from '../common/utils/dates.js';
import {
  CommandeLigneDto,
  CreateCommandeAchatDto,
  PaiementCommandeDto,
  ReceptionCommandeDto,
} from './dto/achat.dto.js';

@Injectable()
export class AchatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async nextNumero(): Promise<string> {
    const start = startOfDayUTC();
    const last = await this.prisma.commandeAchat.findFirst({
      where: { date: { gte: start } },
      orderBy: { date: 'desc' },
      select: { numero: true },
    });
    const num = last ? parseInt(last.numero.split('-').pop() ?? '0', 10) || 0 : 0;
    return generateNumero('BA', num + 1);
  }

  async list(filters?: {
    statut?: StatutCommande;
    fournisseurId?: number;
    search?: string;
    dateDebut?: string;
    dateFin?: string;
    take?: number;
  }) {
    const where: Prisma.CommandeAchatWhereInput = {};
    if (filters?.statut) where.statut = filters.statut;
    if (filters?.fournisseurId) where.fournisseurId = filters.fournisseurId;
    if (filters?.search) {
      where.fournisseur = { nom: { contains: filters.search, mode: 'insensitive' } };
    }
    if (filters?.dateDebut || filters?.dateFin) {
      where.date = {
        ...(filters.dateDebut ? { gte: new Date(filters.dateDebut) } : {}),
        ...(filters.dateFin ? { lte: new Date(filters.dateFin) } : {}),
      };
    }
    return this.prisma.commandeAchat.findMany({
      where,
      include: {
        fournisseur: { select: { id: true, nom: true, entreprise: true } },
        _count: { select: { lignes: true, paiements: true } },
      },
      orderBy: { date: 'desc' },
      take: filters?.take ?? 100,
    });
  }

  async getById(id: number) {
    const c = await this.prisma.commandeAchat.findUnique({
      where: { id },
      include: {
        fournisseur: { select: { id: true, nom: true, entreprise: true, telephone: true } },
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
    if (!c) throw new NotFoundException('Commande d’achat introuvable');
    const paye = c.paiements.reduce((s, p) => s + p.montant, 0);
    return { ...c, totalPaye: paye, resteAPayer: Math.max(0, c.totalTtc - paye) };
  }

  async create(dto: CreateCommandeAchatDto, userId: number) {
    const fournisseur = await this.prisma.fournisseur.findUnique({
      where: { id: dto.fournisseurId },
    });
    if (!fournisseur) throw new NotFoundException('Fournisseur introuvable');

    const lignes = await this.buildLignes(dto.lignes);
    const totals = computeTotals(lignes, dto);
    const numero = await this.nextNumero();

    const commande = await this.prisma.commandeAchat.create({
      data: {
        numero,
        fournisseurId: dto.fournisseurId,
        date: dto.date ? new Date(dto.date) : undefined,
        modePaiement: dto.modePaiement,
        echeance: dto.echeance ? new Date(dto.echeance) : undefined,
        remise: dto.remise ?? 0,
        fraisTransport: dto.fraisTransport ?? 0,
        taxe: dto.taxe ?? 0,
        totalHt: totals.totalHt,
        totalTtc: totals.totalTtc,
        utilisateurId: userId,
        lignes: { create: lignes },
      },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_CREE',
      entite: 'CommandeAchat',
      entiteId: commande.id,
      details: { numero: commande.numero, fournisseurId: fournisseur.id },
    });
    return this.getById(commande.id);
  }

  async addLigne(id: number, dto: CommandeLigneDto, userId: number) {
    await this.ensureEditable(id);
    const produit = await this.prisma.produit.findUnique({ where: { id: dto.produitId } });
    if (!produit) throw new NotFoundException('Produit introuvable');

    const ligne = await this.prisma.commandeAchatLigne.create({
      data: {
        commandeId: id,
        produitId: dto.produitId,
        quantite: dto.quantite,
        prixUnitaire: dto.prixUnitaire,
        sousTotal: dto.prixUnitaire * dto.quantite,
      },
    });
    await this.refreshTotals(id);
    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_LIGNE_AJOUTEE',
      entite: 'CommandeAchat',
      entiteId: id,
      details: { ligneId: ligne.id, produitId: dto.produitId },
    });
    return this.getById(id);
  }

  async removeLigne(id: number, ligneId: number, userId: number) {
    await this.ensureEditable(id);
    await this.prisma.commandeAchatLigne.delete({
      where: { id: ligneId, commandeId: id },
    });
    await this.refreshTotals(id);
    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_LIGNE_SUPPRIMEE',
      entite: 'CommandeAchat',
      entiteId: id,
      details: { ligneId },
    });
    return this.getById(id);
  }

  async valider(id: number, userId: number) {
    const c = await this.prisma.commandeAchat.findUnique({
      where: { id },
      include: { _count: { select: { lignes: true } } },
    });
    if (!c) throw new NotFoundException('Commande d’achat introuvable');
    if (c.statut !== StatutCommande.BROUILLON) {
      throw new BadRequestException('Seules les commandes en brouillon peuvent être validées');
    }
    if (c._count.lignes === 0) {
      throw new BadRequestException('Ajoutez au moins une ligne avant de valider');
    }
    const updated = await this.prisma.commandeAchat.update({
      where: { id },
      data: { statut: StatutCommande.ENVOYEE },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_ENVOYE',
      entite: 'CommandeAchat',
      entiteId: id,
      details: { numero: c.numero },
    });
    return this.getById(updated.id);
  }

  async annuler(id: number, userId: number) {
    const c = await this.prisma.commandeAchat.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Commande d’achat introuvable');
    if (c.statut === StatutCommande.ANNULEE) {
      throw new BadRequestException('La commande est déjà annulée');
    }
    const updated = await this.prisma.commandeAchat.update({
      where: { id },
      data: { statut: StatutCommande.ANNULEE },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_ANNULE',
      entite: 'CommandeAchat',
      entiteId: id,
      details: { numero: c.numero },
    });
    return this.getById(updated.id);
  }

  async receptionner(id: number, dto: ReceptionCommandeDto, userId: number) {
    const c = await this.prisma.commandeAchat.findUnique({
      where: { id },
      include: { lignes: true, fournisseur: { select: { nom: true } } },
    });
    if (!c) throw new NotFoundException('Commande d’achat introuvable');
    if (
      c.statut === StatutCommande.RECUE ||
      c.statut === StatutCommande.PARTIELLEMENT_RECUE ||
      c.statut === StatutCommande.ANNULEE
    ) {
      throw new BadRequestException(`La commande est au statut ${c.statut}, réception impossible`);
    }

    const recuParLigne = new Map(dto.lignes.map((l) => [l.ligneId, l.quantiteRecue]));
    const recus = c.lignes.filter((l) => (recuParLigne.get(l.id) ?? 0) > 0);
    if (recus.length === 0) {
      throw new BadRequestException('Aucune quantité reçue');
    }

    const tousRecus = c.lignes.every((l) => (recuParLigne.get(l.id) ?? 0) >= l.quantite);
    const statut = tousRecus ? StatutCommande.RECUE : StatutCommande.PARTIELLEMENT_RECUE;

    await this.prisma.$transaction(async (tx) => {
      for (const ligne of recus) {
        const qte = recuParLigne.get(ligne.id)!;
        const produit = await tx.produit.findUnique({ where: { id: ligne.produitId } });
        if (!produit) throw new NotFoundException('Produit introuvable');
        await tx.produit.update({
          where: { id: produit.id },
          data: {
            stock: { increment: qte },
            prixAchat: ligne.prixUnitaire,
          },
        });
        await tx.mouvementStock.create({
          data: {
            produitId: produit.id,
            type: TypeMouvementStock.ENTREE_ACHAT,
            quantite: qte,
            motif: `Réception ${c.numero}`,
            reference: c.numero,
            utilisateurId: userId,
          },
        });
      }
      await tx.commandeAchat.update({ where: { id }, data: { statut } });
    });

    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_RECU',
      entite: 'CommandeAchat',
      entiteId: id,
      details: { numero: c.numero, statut, lignesRecues: recus.length },
    });
    return this.getById(id);
  }

  async payer(id: number, dto: PaiementCommandeDto, userId: number) {
    const c = await this.prisma.commandeAchat.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Commande d’achat introuvable');
    const paye = await this.prisma.paiement.aggregate({
      where: { commandeAchatId: id },
      _sum: { montant: true },
    });
    const dejaPaye = paye._sum.montant ?? 0;
    if (dejaPaye + dto.montant > c.totalTtc) {
      throw new BadRequestException(
        `Le paiement dépasse le solde restant (${c.totalTtc - dejaPaye} FCFA)`,
      );
    }
    const paiement = await this.prisma.paiement.create({
      data: {
        sens: SensPaiement.SORTIE,
        montant: dto.montant,
        mode: dto.mode ?? 'ESPECES',
        date: dto.date ? new Date(dto.date) : undefined,
        reference: dto.reference ?? `Paiement ${c.numero}`,
        utilisateurId: userId,
        commandeAchatId: id,
        fournisseurId: c.fournisseurId,
      },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'ACHAT_PAIEMENT',
      entite: 'CommandeAchat',
      entiteId: id,
      details: { paiementId: paiement.id, montant: dto.montant },
    });
    return this.getById(id);
  }

  /** Liste des fournisseurs avec solde dû pour le suivi des dettes. */
  async suiviDettes() {
    const fournisseurs = await this.prisma.fournisseur.findMany({
      include: {
        commandes: { select: { totalTtc: true, statut: true } },
        paiements: { select: { montant: true } },
      },
      orderBy: { nom: 'asc' },
    });
    return fournisseurs.map((f) => {
      const totalCommandes = f.commandes
        .filter((c) => c.statut !== StatutCommande.ANNULEE)
        .reduce((s, c) => s + c.totalTtc, 0);
      const paye = f.paiements.reduce((s, p) => s + p.montant, 0);
      return {
        id: f.id,
        nom: f.nom,
        entreprise: f.entreprise,
        totalAchats: totalCommandes,
        totalPaye: paye,
        dette: Math.max(0, totalCommandes - paye),
      };
    });
  }

  private async ensureEditable(id: number): Promise<CommandeAchat> {
    const c = await this.prisma.commandeAchat.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Commande d’achat introuvable');
    if (c.statut !== StatutCommande.BROUILLON) {
      throw new BadRequestException(
        'Les lignes ne peuvent être modifiées que sur une commande en brouillon',
      );
    }
    return c;
  }

  private async buildLignes(items: CommandeLigneDto[]) {
    const out: Prisma.CommandeAchatLigneCreateWithoutCommandeInput[] = [];
    for (const it of items) {
      const produit = await this.prisma.produit.findUnique({ where: { id: it.produitId } });
      if (!produit) throw new NotFoundException(`Produit introuvable (${it.produitId})`);
      out.push({
        produit: { connect: { id: it.produitId } },
        quantite: it.quantite,
        prixUnitaire: it.prixUnitaire,
        sousTotal: it.prixUnitaire * it.quantite,
      });
    }
    return out;
  }

  private async refreshTotals(id: number) {
    const lignes = await this.prisma.commandeAchatLigne.findMany({ where: { commandeId: id } });
    const c = await this.prisma.commandeAchat.findUnique({ where: { id }, select: { remise: true, fraisTransport: true, taxe: true } });
    if (!c) return;
    const totalHt = lignes.reduce((s, l) => s + l.sousTotal, 0);
    const totalTtc = Math.max(0, totalHt - c.remise + c.fraisTransport + c.taxe);
    await this.prisma.commandeAchat.update({
      where: { id },
      data: { totalHt, totalTtc },
    });
  }
}

function computeTotals(
  lignes: { sousTotal: number }[],
  dto: { remise?: number; fraisTransport?: number; taxe?: number },
) {
  const totalHt = lignes.reduce((s, l) => s + l.sousTotal, 0);
  const totalTtc = Math.max(
    0,
    totalHt - (dto.remise ?? 0) + (dto.fraisTransport ?? 0) + (dto.taxe ?? 0),
  );
  return { totalHt, totalTtc };
}