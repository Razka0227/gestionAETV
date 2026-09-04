import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SensMouvementCaisse,
  StatutCaisse,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { startOfDayUTC } from '../common/utils/dates.js';
import {
  FermerCaisseDto,
  MouvementCaisseDto,
  OuvrirCaisseDto,
} from './dto/caisse.dto.js';

@Injectable()
export class CaisseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async sessionOuverte() {
    return this.prisma.caisseSession.findFirst({
      where: { statut: StatutCaisse.OUVERTE },
      orderBy: { dateOuverture: 'desc' },
      include: {
        utilisateur: { select: { id: true, nom: true } },
        mouvements: { orderBy: { date: 'desc' } },
      },
    });
  }

  async etat() {
    const session = await this.sessionOuverte();
    if (!session) {
      return { ouverte: false, session: null };
    }
    const entree = session.mouvements
      .filter((m) => m.sens === SensMouvementCaisse.ENTREE)
      .reduce((s, m) => s + m.montant, 0);
    const sortie = session.mouvements
      .filter((m) => m.sens === SensMouvementCaisse.SORTIE)
      .reduce((s, m) => s + m.montant, 0);
    const theorique = session.fondDeCaisse + entree - sortie;
    return {
      ouverte: true,
      session: { ...session, entree, sortie, montantTheorique: theorique },
    };
  }

  async jour(filters?: { date?: string }) {
    const debut = filters?.date
      ? new Date(filters.date)
      : startOfDayUTC();
    const fin = new Date(debut.getTime() + 86400000);
    const sessions = await this.prisma.caisseSession.findMany({
      where: { dateOuverture: { gte: debut, lt: fin } },
      include: {
        utilisateur: { select: { id: true, nom: true } },
        mouvements: { orderBy: { date: 'asc' } },
      },
      orderBy: { dateOuverture: 'asc' },
    });
    return sessions.map(({ mouvements, ...s }) => ({
      ...s,
      entree: mouvements
        .filter((m) => m.sens === SensMouvementCaisse.ENTREE)
        .reduce((sum, m) => sum + m.montant, 0),
      sortie: mouvements
        .filter((m) => m.sens === SensMouvementCaisse.SORTIE)
        .reduce((sum, m) => sum + m.montant, 0),
      mouvements,
    }));
  }

  async ouvrir(dto: OuvrirCaisseDto, userId: number) {
    const exists = await this.sessionOuverte();
    if (exists) {
      throw new BadRequestException(
        'Une caisse est déjà ouverte — fermez-la avant d’en ouvrir une autre.',
      );
    }
    const session = await this.prisma.caisseSession.create({
      data: {
        utilisateurId: userId,
        fondDeCaisse: dto.fondDeCaisse,
        montantTheorique: dto.fondDeCaisse,
        statut: StatutCaisse.OUVERTE,
      },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'CAISSE_OUVERTE',
      entite: 'CaisseSession',
      entiteId: session.id,
      details: { fondDeCaisse: dto.fondDeCaisse },
    });
    return this.etat();
  }

  async fermer(
    dto: FermerCaisseDto,
    userId: number,
    sessionId?: number,
  ) {
    const session =
      (sessionId
        ? await this.prisma.caisseSession.findUnique({ where: { id: sessionId } })
        : await this.sessionOuverte()) ?? undefined;
    if (!session) throw new NotFoundException('Aucune session de caisse ouverte');
    if (session.statut === StatutCaisse.FERMEE) {
      throw new BadRequestException('Cette session est déjà fermée');
    }
    const mouvements = await this.prisma.mouvementCaisse.findMany({
      where: { caisseId: session.id },
    });
    const entree = mouvements
      .filter((m) => m.sens === SensMouvementCaisse.ENTREE)
      .reduce((s, m) => s + m.montant, 0);
    const sortie = mouvements
      .filter((m) => m.sens === SensMouvementCaisse.SORTIE)
      .reduce((s, m) => s + m.montant, 0);
    const theorique = session.fondDeCaisse + entree - sortie;
    const ecart = dto.montantReel - theorique;

    const updated = await this.prisma.caisseSession.update({
      where: { id: session.id },
      data: {
        montantTheorique: theorique,
        montantReel: dto.montantReel,
        ecart,
        dateFermeture: new Date(),
        statut: StatutCaisse.FERMEE,
      },
    });
    if (dto.observation) {
      await this.prisma.mouvementCaisse.create({
        data: {
          caisseId: session.id,
          sens: SensMouvementCaisse.ENTREE,
          montant: 0,
          motif: `Fermeture : ${dto.observation}`,
        },
      });
    }
    await this.audit.log({
      utilisateurId: userId,
      action: 'CAISSE_FERMEE',
      entite: 'CaisseSession',
      entiteId: session.id,
      details: { theorique, reel: dto.montantReel, ecart },
    });
    return updated;
  }

  async mouvement(dto: MouvementCaisseDto, userId: number) {
    const session = await this.sessionOuverte();
    if (!session) {
      throw new BadRequestException(
        'Aucune caisse ouverte — ouvrez d’abord la session.',
      );
    }
    if (dto.sens === SensMouvementCaisse.SORTIE) {
      const entree = session.mouvements
        .filter((m) => m.sens === SensMouvementCaisse.ENTREE)
        .reduce((s, m) => s + m.montant, 0);
      const sortie = session.mouvements
        .filter((m) => m.sens === SensMouvementCaisse.SORTIE)
        .reduce((s, m) => s + m.montant, 0);
      if (dto.montant > session.fondDeCaisse + entree - sortie) {
        throw new BadRequestException('Fonds insuffisants en caisse');
      }
    }
    await this.prisma.mouvementCaisse.create({
      data: {
        caisseId: session.id,
        sens: dto.sens,
        montant: dto.montant,
        motif: dto.motif,
      },
    });
    await this.audit.log({
      utilisateurId: userId,
      action: 'CAISSE_MOUVEMENT',
      entite: 'CaisseSession',
      entiteId: session.id,
      details: { sens: dto.sens, montant: dto.montant, motif: dto.motif },
    });
    return this.etat();
  }
}