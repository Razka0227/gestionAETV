import { Injectable } from '@nestjs/common';
import { StatutVente, TypeMouvementStock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  startOfDayUTC,
  startOfMonthUTC,
} from '../common/utils/dates.js';

export interface RapportPeriode {
  dateDebut?: string;
  dateFin?: string;
}

@Injectable()
export class RapportsService {
  constructor(private readonly prisma: PrismaService) {}

  private periode(filters?: RapportPeriode) {
    const debut = filters?.dateDebut
      ? new Date(filters.dateDebut)
      : startOfMonthUTC();
    const fin = filters?.dateFin
      ? new Date(filters.dateFin)
      : new Date(startOfDayUTC().getTime() + 86400000 - 1);
    return { debut, fin };
  }

  async ventes(filters?: RapportPeriode) {
    const { debut, fin } = this.periode(filters);
    const ventes = await this.prisma.vente.findMany({
      where: {
        statut: { not: StatutVente.ANNULEE },
        date: { gte: debut, lte: fin },
      },
      include: {
        lignes: { select: { quantite: true, sousTotal: true, coutUnitaire: true } },
      },
    });
    const parJour = new Map<string, { montant: number; quantite: number; nombre: number }>();
    for (const v of ventes) {
      const cle = v.date.toISOString().slice(0, 10);
      const e = parJour.get(cle) ?? { montant: 0, quantite: 0, nombre: 0 };
      e.montant += v.total;
      e.nombre += 1;
      for (const l of v.lignes) {
        e.quantite += l.quantite;
      }
      parJour.set(cle, e);
    }
    const jours = Array.from(parJour.entries())
      .map(([date, agg]) => ({ date, ...agg }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { jours, total: jours.reduce((s, j) => s + j.montant, 0) };
  }

  async produits(filters?: RapportPeriode, take = 10) {
    const { debut, fin } = this.periode(filters);
    const lignes = await this.prisma.venteLigne.findMany({
      where: {
        vente: {
          statut: { not: StatutVente.ANNULEE },
          date: { gte: debut, lte: fin },
        },
      },
      select: {
        quantite: true,
        sousTotal: true,
        coutUnitaire: true,
        produit: { select: { id: true, nom: true, reference: true } },
      },
    });
    const map = new Map<
      number,
      { produit: { id: number; nom: string; reference: string }; quantite: number; montant: number; cout: number }
    >();
    for (const l of lignes) {
      const e = map.get(l.produit.id) ?? {
        produit: l.produit,
        quantite: 0,
        montant: 0,
        cout: 0,
      };
      e.quantite += l.quantite;
      e.montant += l.sousTotal;
      e.cout += l.coutUnitaire * l.quantite;
      map.set(l.produit.id, e);
    }
    return Array.from(map.values())
      .map((e) => ({ ...e, benefice: e.montant - e.cout }))
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, take);
  }

  async categories(filters?: RapportPeriode) {
    const { debut, fin } = this.periode(filters);
    const lignes = await this.prisma.venteLigne.findMany({
      where: {
        vente: {
          statut: { not: StatutVente.ANNULEE },
          date: { gte: debut, lte: fin },
        },
      },
      select: {
        quantite: true,
        sousTotal: true,
        produit: {
          select: {
            categorie: {
              select: { nom: true, parent: { select: { nom: true } } },
            },
          },
        },
      },
    });
    const map = new Map<string, { nom: string; quantite: number; montant: number }>();
    for (const l of lignes) {
      const nom = l.produit.categorie?.parent?.nom ?? l.produit.categorie?.nom ?? 'Sans catégorie';
      const e = map.get(nom) ?? { nom, quantite: 0, montant: 0 };
      e.quantite += l.quantite;
      e.montant += l.sousTotal;
      map.set(nom, e);
    }
    return Array.from(map.values()).sort((a, b) => b.montant - a.montant);
  }

  async marques(filters?: RapportPeriode) {
    const { debut, fin } = this.periode(filters);
    const lignes = await this.prisma.venteLigne.findMany({
      where: {
        vente: {
          statut: { not: StatutVente.ANNULEE },
          date: { gte: debut, lte: fin },
        },
      },
      select: {
        quantite: true,
        sousTotal: true,
        produit: { select: { marque: { select: { nom: true } } } },
      },
    });
    const map = new Map<string, { nom: string; quantite: number; montant: number }>();
    for (const l of lignes) {
      const nom = l.produit.marque?.nom ?? 'Sans marque';
      const e = map.get(nom) ?? { nom, quantite: 0, montant: 0 };
      e.quantite += l.quantite;
      e.montant += l.sousTotal;
      map.set(nom, e);
    }
    return Array.from(map.values()).sort((a, b) => b.montant - a.montant);
  }

  async clients(filters?: RapportPeriode, take = 10) {
    const { debut, fin } = this.periode(filters);
    const rows = await this.prisma.vente.groupBy({
      by: ['clientId'],
      where: {
        statut: { not: StatutVente.ANNULEE },
        date: { gte: debut, lte: fin },
        clientId: { not: null },
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const ids = rows.map((r) => r.clientId as number);
    const clients = ids.length
      ? await this.prisma.client.findMany({
          where: { id: { in: ids } },
          select: { id: true, nom: true, prenom: true, telephone: true },
        })
      : [];
    const map = new Map(clients.map((c) => [c.id, c]));
    return rows
      .map((r) => ({
        client: map.get(r.clientId as number) ?? null,
        montant: r._sum.total ?? 0,
        nombre: r._count._all,
      }))
      .filter((r) => r.client)
      .sort((a, b) => b.montant - a.montant)
      .slice(0, take);
  }

  async achats(filters?: RapportPeriode) {
    const { debut, fin } = this.periode(filters);
    const commandes = await this.prisma.commandeAchat.findMany({
      where: {
        statut: { not: 'ANNULEE' },
        date: { gte: debut, lte: fin },
      },
      include: {
        fournisseur: { select: { id: true, nom: true } },
        paiements: { select: { montant: true } },
      },
    });
    const totalAchats = commandes.reduce((s, c) => s + c.totalTtc, 0);
    const totalPaye = commandes.reduce(
      (s, c) => s + c.paiements.reduce((p, pv) => p + pv.montant, 0),
      0,
    );
    const parFournisseur = new Map<string, number>();
    for (const c of commandes) {
      const nom = c.fournisseur?.nom ?? 'Inconnu';
      parFournisseur.set(nom, (parFournisseur.get(nom) ?? 0) + c.totalTtc);
    }
    return {
      totalAchats,
      totalPaye,
      dette: Math.max(0, totalAchats - totalPaye),
      nombreCommandes: commandes.length,
      parFournisseur: Array.from(parFournisseur.entries())
        .map(([nom, montant]) => ({ nom, montant }))
        .sort((a, b) => b.montant - a.montant),
    };
  }

  async stock() {
    const produits = await this.prisma.produit.findMany({
      where: { actif: true },
      select: { stock: true, stockMin: true, prixAchat: true },
    });
    const valeur = produits.reduce((s, p) => s + p.stock * p.prixAchat, 0);
    return {
      valeur,
      totalProduits: produits.length,
      rupture: produits.filter((p) => p.stock <= 0).length,
      bas: produits.filter((p) => p.stock > 0 && p.stock <= p.stockMin).length,
    };
  }

  async overview(filters?: RapportPeriode) {
    const { debut, fin } = this.periode(filters);
    const [ventes, benefice] = await Promise.all([
      this.prisma.vente.aggregate({
        where: { statut: { not: StatutVente.ANNULEE }, date: { gte: debut, lte: fin } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.venteLigne.aggregate({
        where: {
          vente: { statut: { not: StatutVente.ANNULEE }, date: { gte: debut, lte: fin } },
        },
        _sum: { sousTotal: true, coutUnitaire: true, quantite: true },
      }),
    ]);
    const ca = ventes._sum.total ?? 0;
    const cout =
      (benefice._sum.coutUnitaire ?? 0) * (benefice._sum.quantite ?? 0);
    const depenses = await this.prisma.depense.aggregate({
      where: { date: { gte: debut, lte: fin } },
      _sum: { montant: true },
    });
    const achats = await this.prisma.commandeAchat.aggregate({
      where: { statut: { not: 'ANNULEE' }, date: { gte: debut, lte: fin } },
      _sum: { totalTtc: true },
    });
    const mouvementsSorties = await this.prisma.mouvementStock.aggregate({
      where: {
        type: TypeMouvementStock.SORTIE_VENTE,
        date: { gte: debut, lte: fin },
      },
      _sum: { quantite: true },
    });
    return {
      ca,
      nombreVentes: ventes._count._all,
      benefice: Math.max(0, ca - cout - (depenses._sum.montant ?? 0)),
      beneficeBrut: Math.max(0, ca - cout),
      depenses: depenses._sum.montant ?? 0,
      achats: achats._sum.totalTtc ?? 0,
      unitesVendues: Math.abs(mouvementsSorties._sum.quantite ?? 0),
    };
  }
}