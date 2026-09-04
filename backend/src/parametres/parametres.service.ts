import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ParametresService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.parametre.findMany({ orderBy: { cle: 'asc' } });
    const out: Record<string, string> = {};
    for (const r of rows) out[r.cle] = r.valeur;
    return out;
  }

  async getCle(cle: string, defaultValue = '') {
    const row = await this.prisma.parametre.findUnique({ where: { cle } });
    return row?.valeur ?? defaultValue;
  }

  async set(cle: string, valeur: string, description?: string) {
    return this.prisma.parametre.upsert({
      where: { cle },
      create: { cle, valeur, description },
      update: { valeur, ...(description !== undefined ? { description } : {}) },
    });
  }

  async seedDefaults() {
    const defaults: { cle: string; valeur: string; description: string }[] = [
      { cle: 'boutique.nom', valeur: 'Boutique Test', description: 'Nom de la boutique' },
      { cle: 'boutique.adresse', valeur: '', description: 'Adresse de la boutique' },
      { cle: 'boutique.telephone', valeur: '', description: 'Téléphone de la boutique' },
      { cle: 'devise', valeur: 'XOF', description: 'Devise (XOF, EUR, USD...)' },
      { cle: 'taxe_defaut', valeur: '0', description: 'Taxe par défaut en %' },
      { cle: 'vente_negative', valeur: 'false', description: 'Autoriser la vente en stock négatif' },
      { cle: 'remise_max', valeur: '0', description: 'Remise max autorisée au caissier en % (0 = illimitée)' },
      { cle: 'programme_fidelite', valeur: 'false', description: 'Activer le programme de fidélité' },
      { cle: 'points_par_1000', valeur: '1', description: 'Points fidélité pour 1000 FCFA' },
    ];
    for (const d of defaults) {
      await this.set(d.cle, d.valeur, d.description);
    }
  }
}