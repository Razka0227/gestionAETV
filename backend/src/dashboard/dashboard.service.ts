import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  startOfDayUTC,
  startOfMonthUTC,
  startOfWeekUTC,
} from '../common/utils/dates.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async rangeTotals(since: Date) {
    const where: Prisma.VenteWhereInput = {
      statut: { in: ['VALIDEE', 'RETOURNEE'] },
      date: { gte: since },
    };
    const agg = await this.prisma.vente.aggregate({
      where,
      _sum: { total: true },
      _count: true,
    });
    return {
      montant: agg._sum.total ?? 0,
      ventes: agg._count,
    };
  }

  private async benefice(since: Date): Promise<number> {
    const lignes = await this.prisma.venteLigne.findMany({
      where: {
        vente: {
          statut: { in: ['VALIDEE', 'RETOURNEE'] },
          date: { gte: since },
        },
      },
      select: { quantite: true, prixUnitaire: true, coutUnitaire: true },
    });
    return lignes.reduce(
      (sum, l) => sum + (l.prixUnitaire - l.coutUnitaire) * l.quantite,
      0,
    );
  }

  private async topProduits(since: Date, limit = 5) {
    const lignes = await this.prisma.venteLigne.findMany({
      where: {
        vente: {
          statut: { in: ['VALIDEE', 'RETOURNEE'] },
          date: { gte: since },
        },
      },
      select: {
        produitId: true,
        quantite: true,
        prixUnitaire: true,
        produit: { select: { id: true, nom: true, reference: true } },
      },
    });
    const map = new Map<
      number,
      { produit: { id: number; nom: string; reference: string }; quantite: number; montant: number }
    >();
    for (const l of lignes) {
      const curr = map.get(l.produitId) ?? {
        produit: l.produit,
        quantite: 0,
        montant: 0,
      };
      curr.quantite += l.quantite;
      curr.montant += l.quantite * l.prixUnitaire;
      map.set(l.produitId, curr);
    }
    return [...map.values()]
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, limit);
  }

  private async stocksAlertes() {
    const [rupture, low] = await Promise.all([
      this.prisma.produit.count({ where: { actif: true, stock: 0 } }),
      this.prisma.$queryRaw<Array<{
        id: number;
        nom: string;
        reference: string;
        stock: number;
        stockMin: number;
      }>>`
      SELECT id, nom, reference, stock, "stockMin"
      FROM produits
      WHERE actif = true AND stock > 0 AND stock <= "stockMin"
      ORDER BY stock ASC
      LIMIT 10;
    `,
    ]);

    return {
      rupture,
      bas: low.map((r) => ({ ...r, stock: Number(r.stock), stockMin: Number(r.stockMin) })),
      totalProduits: await this.prisma.produit.count({ where: { actif: true } }),
    };
  }

  private async dettesFournisseurs(): Promise<number> {
    const commandes = await this.prisma.commandeAchat.findMany({
      where: { statut: { not: 'ANNULEE' } },
      select: { id: true, totalTtc: true, paiements: { select: { montant: true, sens: true } } },
    });
    return commandes.reduce((sum, c) => {
      const paye = c.paiements
        .filter((p) => p.sens === 'SORTIE')
        .reduce((s, p) => s + p.montant, 0);
      return sum + Math.max(0, c.totalTtc - paye);
    }, 0);
  }

  private async creditsClients(): Promise<number> {
    const ventes = await this.prisma.vente.findMany({
      where: { statut: { in: ['VALIDEE', 'RETOURNEE'] } },
      select: {
        id: true,
        total: true,
        clientId: true,
        paiements: { select: { montant: true, sens: true } },
      },
    });
    const payeParVente = new Map<number, number>();
    const payeParClient = new Map<number, number>();
    for (const v of ventes) {
      let pv = 0;
      for (const p of v.paiements) {
        if (p.sens === 'ENTREE') pv += p.montant;
      }
      payeParVente.set(v.id, pv);
      if (v.clientId) {
        payeParClient.set(v.clientId, (payeParClient.get(v.clientId) ?? 0) + pv);
      }
    }
    const credits = ventes
      .filter((v) => v.clientId !== null && v.total > (payeParVente.get(v.id) ?? 0))
      .map((v) => v.total - (payeParVente.get(v.id) ?? 0));
    return credits.reduce((a, b) => a + b, 0);
  }

  async summary() {
    const now = new Date();
    const today = startOfDayUTC(now);
    const week = startOfWeekUTC(now);
    const month = startOfMonthUTC(now);

    const [caJour, caSemaine, caMois, beneficeJour, beneficeMois, topProduits, alertes, achatsMois, depensesMois] =
      await Promise.all([
        this.rangeTotals(today),
        this.rangeTotals(week),
        this.rangeTotals(month),
        this.benefice(today),
        this.benefice(month),
        this.topProduits(month),
        this.stocksAlertes(),
        this.prisma.commandeAchat.aggregate({
          where: { statut: { not: 'ANNULEE' }, date: { gte: month } },
          _sum: { totalTtc: true },
        }),
        this.prisma.depense.aggregate({
          where: { date: { gte: month } },
          _sum: { montant: true },
        }),
      ]);

    const [dettesFournisseurs, creditsClients] = await Promise.all([
      this.dettesFournisseurs(),
      this.creditsClients(),
    ]);

    return {
      date: now.toISOString(),
      ca: {
        jour: caJour.montant,
        semaine: caSemaine.montant,
        mois: caMois.montant,
      },
      ventes: {
        jour: caJour.ventes,
        semaine: caSemaine.ventes,
        mois: caMois.ventes,
      },
      benefice: { jour: beneficeJour, mois: beneficeMois },
      topProduits,
      stocks: alertes,
      achatsMois: achatsMois._sum.totalTtc ?? 0,
      depensesMois: depensesMois._sum.montant ?? 0,
      dettesFournisseurs,
      creditsClients,
    };
  }
}