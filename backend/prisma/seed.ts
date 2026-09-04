/**
 * Jeu de données fictives pour les tests et la démonstration.
 * Lancement : npm run seed  (ou : npx prisma db seed)
 * Mot de passe de tous les comptes démo : admin123
 */
import {
  PrismaClient,
  Role,
  StatutCommande,
  StatutVente,
  TypeMouvementStock,
  TypeRetour,
  TypeVente,
  ModePaiement,
  SensPaiement,
  StatutRetour,
} from '@prisma/client';
import { loadEnvFile } from 'node:process';
import * as bcrypt from 'bcryptjs';
import { generateNumero } from '../src/common/utils/refs.js';

loadEnvFile('.env');

const prisma = new PrismaClient();

/** Pseudo-aléatoire déterministe pour un seed reproductible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260828);
const randInt = (min: number, max: number) =>
  Math.floor(rnd() * (max - min + 1)) + min;
const choice = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

function daysAgoUTC(days: number, hour = 10): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, randInt(0, 59), randInt(0, 59), 0);
  return d;
}

async function clean() {
  const tables = [
    'auditLog',
    'mouvementCaisse',
    'caisseSession',
    'retourLigne',
    'retour',
    'paiement',
    'venteLigne',
    'vente',
    'commandeAchatLigne',
    'commandeAchat',
    'inventaireLigne',
    'inventaire',
    'depense',
    'depenseCategorie',
    'mouvementStock',
    'lot',
    'produitVariante',
    'produit',
    'marque',
    'categorie',
    'client',
    'fournisseur',
    'utilisateur',
    'parametre',
    'boutique',
  ];
  for (const t of tables) {
    await (prisma as any)[t].deleteMany();
  }
}

async function main() {
  console.log('🧹 Nettoyage de la base...');
  await clean();

  // ---------------- Boutique & paramètres ----------------
  const boutique = await prisma.boutique.create({
    data: {
      nom: 'Boutique Test',
      adresse: 'Avenue de la République, Dakar',
      telephone: '+221 77 000 00 00',
      devise: 'XOF',
    },
  });

  const params: [string, string, string?][] = [
    ['boutique.nom', 'Boutique Test', 'Nom de la boutique'],
    ['boutique.adresse', 'Avenue de la République, Dakar', 'Adresse'],
    ['boutique.telephone', '+221 77 000 00 00', 'Téléphone'],
    ['devise', 'XOF', 'Devise'],
    ['taxe_defaut', '0', 'Taxe par défaut en %'],
    ['vente_negative', 'false', 'Autoriser la vente en stock négatif'],
    ['remise_max', '10', 'Remise max caissier en %'],
    ['programme_fidelite', 'true', 'Programme de fidélité'],
    ['points_par_1000', '1', 'Points fidélité par 1000 FCFA'],
  ];
  for (const [cle, valeur, description] of params) {
    await prisma.parametre.create({ data: { cle, valeur, description } });
  }

  // ---------------- Utilisateurs ----------------
  const hash = await bcrypt.hash('admin123', 10);
  const [admin, gerant, caissier, magasinier, comptable] = await Promise.all([
    prisma.utilisateur.create({ data: { nom: 'Administrateur Système', email: 'admin@boutique.test', motDePasseHash: hash, role: Role.ADMIN, boutiqueId: boutique.id } }),
    prisma.utilisateur.create({ data: { nom: 'Mamadou Diallo (Gérant)', email: 'gerant@boutique.test', motDePasseHash: hash, role: Role.GERANT, boutiqueId: boutique.id } }),
    prisma.utilisateur.create({ data: { nom: 'Awa Sarr (Caissière)', email: 'caissier@boutique.test', motDePasseHash: hash, role: Role.CAISSIER, boutiqueId: boutique.id } }),
    prisma.utilisateur.create({ data: { nom: 'Omar Cissé (Magasinier)', email: 'magasinier@boutique.test', motDePasseHash: hash, role: Role.MAGASINIER, boutiqueId: boutique.id } }),
    prisma.utilisateur.create({ data: { nom: 'Ndeye Gueye (Comptable)', email: 'comptable@boutique.test', motDePasseHash: hash, role: Role.COMPTABLE, boutiqueId: boutique.id } }),
  ]);

  // ---------------- Catalogue ----------------
  const vetements = await prisma.categorie.create({ data: { nom: 'Vêtements' } });
  const hommes = await prisma.categorie.create({ data: { nom: 'Hommes', parentId: vetements.id } });
  const femmes = await prisma.categorie.create({ data: { nom: 'Femmes', parentId: vetements.id } });
  const chaussures = await prisma.categorie.create({ data: { nom: 'Chaussures' } });
  const sacs = await prisma.categorie.create({ data: { nom: 'Sacs & Accessoires' } });
  const electronique = await prisma.categorie.create({ data: { nom: 'Électronique' } });
  const cosmetiques = await prisma.categorie.create({ data: { nom: 'Cosmétiques' } });

  const [nike, adidas, samsung, xiaomi, loreal, nivea] = await Promise.all([
    prisma.marque.create({ data: { nom: 'Nike' } }),
    prisma.marque.create({ data: { nom: 'Adidas' } }),
    prisma.marque.create({ data: { nom: 'Samsung' } }),
    prisma.marque.create({ data: { nom: 'Xiaomi' } }),
    prisma.marque.create({ data: { nom: "L'Oréal" } }),
    prisma.marque.create({ data: { nom: 'Nivea' } }),
  ]);

  type P = {
    nom: string;
    reference: string;
    codeBarre: string;
    categorieId: number;
    marqueId?: number;
    prixAchat: number;
    prixVente: number;
    prixGros?: number;
    prixPromo?: number;
    stockMin: number;
    emplacement: string;
    unite?: string;
    suitLots?: boolean;
  };
  const produitsDefs: P[] = [
    { nom: 'Chemise Homme', reference: 'REF-0001', codeBarre: '6900000000011', categorieId: hommes.id, marqueId: nike.id, prixAchat: 4500, prixVente: 7500, prixGros: 6500, prixPromo: 6900, stockMin: 4, emplacement: 'A1' },
    { nom: 'Pantalon Jean', reference: 'REF-0002', codeBarre: '6900000000028', categorieId: hommes.id, marqueId: adidas.id, prixAchat: 6500, prixVente: 11000, prixGros: 9500, stockMin: 3, emplacement: 'A2' },
    { nom: 'T-shirt Coton', reference: 'REF-0003', codeBarre: '6900000000035', categorieId: hommes.id, marqueId: nike.id, prixAchat: 1800, prixVente: 3500, prixGros: 2900, prixPromo: 3000, stockMin: 8, emplacement: 'A3' },
    { nom: 'Robe Fleurie', reference: 'REF-0004', codeBarre: '6900000000042', categorieId: femmes.id, marqueId: adidas.id, prixAchat: 5200, prixVente: 9000, prixGros: 7800, stockMin: 3, emplacement: 'B1' },
    { nom: 'Jupe Cloche', reference: 'REF-0005', codeBarre: '6900000000059', categorieId: femmes.id, prixAchat: 3800, prixVente: 6500, prixGros: 5600, stockMin: 4, emplacement: 'B2' },
    { nom: 'Baskets Sport', reference: 'REF-0006', codeBarre: '6900000000066', categorieId: chaussures.id, marqueId: nike.id, prixAchat: 12000, prixVente: 22000, prixGros: 18500, prixPromo: 20000, stockMin: 3, emplacement: 'C1' },
    { nom: 'Sandales Cuir', reference: 'REF-0007', codeBarre: '6900000000073', categorieId: chaussures.id, prixAchat: 5500, prixVente: 9800, prixGros: 8200, stockMin: 4, emplacement: 'C2' },
    { nom: 'Mocassins', reference: 'REF-0008', codeBarre: '6900000000080', categorieId: chaussures.id, prixAchat: 7800, prixVente: 13500, prixGros: 11500, stockMin: 2, emplacement: 'C3' },
    { nom: 'Sac à Main', reference: 'REF-0009', codeBarre: '6900000000097', categorieId: sacs.id, prixAchat: 4200, prixVente: 8000, prixGros: 6900, stockMin: 3, emplacement: 'D1' },
    { nom: 'Ceinture Cuir', reference: 'REF-0010', codeBarre: '6900000000103', categorieId: sacs.id, prixAchat: 2500, prixVente: 4800, prixGros: 4000, stockMin: 5, emplacement: 'D2' },
    { nom: 'Chargeur USB-C 25W', reference: 'REF-0011', codeBarre: '6900000000110', categorieId: electronique.id, marqueId: samsung.id, prixAchat: 3000, prixVente: 6000, prixGros: 5200, prixPromo: 5500, stockMin: 6, emplacement: 'E1' },
    { nom: 'Écouteurs Bluetooth', reference: 'REF-0012', codeBarre: '6900000000127', categorieId: electronique.id, marqueId: xiaomi.id, prixAchat: 5500, prixVente: 12000, prixGros: 10000, stockMin: 4, emplacement: 'E2' },
    { nom: 'Powerbank 10 000 mAh', reference: 'REF-0013', codeBarre: '6900000000134', categorieId: electronique.id, marqueId: xiaomi.id, prixAchat: 7500, prixVente: 15000, prixGros: 12800, stockMin: 3, emplacement: 'E3' },
    { nom: 'Crème Hydratante', reference: 'REF-0014', codeBarre: '6900000000141', categorieId: cosmetiques.id, marqueId: nivea.id, prixAchat: 2200, prixVente: 4000, prixGros: 3400, stockMin: 7, emplacement: 'F1', unite: 'pot 50ml' },
    { nom: 'Parfum 50 ml', reference: 'REF-0015', codeBarre: '6900000000158', categorieId: cosmetiques.id, marqueId: loreal.id, prixAchat: 8500, prixVente: 15000, prixGros: 13000, prixPromo: 14000, stockMin: 2, emplacement: 'F2' },
    { nom: 'Savon Naturel', reference: 'REF-0016', codeBarre: '6900000000165', categorieId: cosmetiques.id, marqueId: nivea.id, prixAchat: 900, prixVente: 1800, prixGros: 1500, stockMin: 10, emplacement: 'F3', unite: 'pack 3' },
  ];

  const produits = new Map<number, { id: number; stock: number }>();
  const produitsById = new Map<number, { id: number; stock: number }>();
  let seqP = 1;
  for (const def of produitsDefs) {
    const p = await prisma.produit.create({
      data: { ...def, stock: 0, suitLots: def.suitLots ?? false },
    });
    const rec = { id: p.id, stock: 0 };
    produits.set(seqP, rec);
    produitsById.set(p.id, rec);
    seqP++;
  }

  // ---------------- Tiers ----------------
  const fournisseurs = [];
  for (const f of [
    { nom: 'Moussa Diop', entreprise: 'Dakar Distribution', telephone: '+221 77 111 22 33', adresse: 'Dakar Plateau' },
    { nom: 'Aminata Sow', entreprise: 'Import & Co', telephone: '+221 78 222 33 44', adresse: 'Pikine Technopole' },
    { nom: 'Jean Kouassi', entreprise: 'Tech Supply', telephone: '+221 76 333 44 55', adresse: 'Zone Industrielle' },
    { nom: 'Fatou Ndiaye', entreprise: 'Beauté Import', telephone: '+221 70 444 55 66', adresse: 'Sandeir Marketplace' },
  ]) {
    fournisseurs.push(await prisma.fournisseur.create({ data: f }));
  }

  const clients = [];
  for (const c of [
    { nom: 'Aminata Diallo', telephone: '+221 77 555 66 77', adresse: 'Ouakam' },
    { nom: 'Ousmane Ba', telephone: '+221 78 666 77 88', adresse: 'Grand Dakar' },
    { nom: 'Khadija Ndiaye', telephone: '+221 76 777 88 99', adresse: 'Mermoz' },
    { nom: 'Ibrahima Fall', telephone: '+221 70 888 99 00', adresse: 'Nord Foire' },
    { nom: 'Marie Camara', telephone: '+221 77 999 00 11', adresse: 'Liberté 6' },
  ]) {
    clients.push(await prisma.client.create({ data: c }));
  }

  // ---------------- Achats (réceptions) ----------------
  const productList = [...produitsDefs];
  let seq = 1;

  // Stock initial : une grosse réception le 1er août.
  const numBA = generateNumero('BA', seq++, daysAgoUTC(28, 9));
  const ligneInit = productList.map((p) => ({
    produitId: produits.get(productList.indexOf(p) + 1)!.id,
    quantite: 25,
    prixUnitaire: p.prixAchat,
    sousTotal: 25 * p.prixAchat,
  }));
  const totalInit = ligneInit.reduce((s, l) => s + l.sousTotal, 0);
  await prisma.commandeAchat.create({
    data: {
      numero: numBA,
      fournisseurId: fournisseurs[0].id,
      boutiqueId: boutique.id,
      date: daysAgoUTC(28, 9),
      statut: StatutCommande.RECUE,
      totalHt: totalInit,
      totalTtc: totalInit,
      modePaiement: ModePaiement.VIREMENT,
      utilisateurId: magasinier.id,
      lignes: { create: ligneInit },
      paiements: {
        create: [
          {
            sens: SensPaiement.SORTIE,
            montant: Math.round(totalInit * 0.6),
            mode: ModePaiement.VIREMENT,
            date: daysAgoUTC(28, 11),
            utilisateurId: comptable.id,
            fournisseurId: fournisseurs[0].id,
          },
          {
            sens: SensPaiement.SORTIE,
            montant: Math.round(totalInit * 0.4),
            mode: ModePaiement.VIREMENT,
            date: daysAgoUTC(20, 10),
            utilisateurId: comptable.id,
            fournisseurId: fournisseurs[0].id,
          },
        ],
      },
    },
  });
  for (const [idx, l] of ligneInit.entries()) {
    const p = produits.get(idx + 1)!;
    p.stock += l.quantite;
    await prisma.mouvementStock.create({
      data: {
        produitId: l.produitId,
        type: TypeMouvementStock.ENTREE_ACHAT,
        quantite: l.quantite,
        reference: numBA,
        utilisateurId: magasinier.id,
        boutiqueId: boutique.id,
        date: daysAgoUTC(28, 9),
        motif: 'Réception du stock initial',
      },
    });
    await prisma.produit.update({
      where: { id: l.produitId },
      data: { stock: p.stock },
    });
  }

  // Réception récente (3 produits réapprovisionnés).
  const reappro = productList.slice(10, 13); // électronique
  const numBA2 = generateNumero('BA', seq++, daysAgoUTC(6, 14));
  const ligneRea = reappro.map((p) => {
    const refIndex = productList.indexOf(p) + 1;
    return {
      produitId: produits.get(refIndex)!.id,
      quantite: 30,
      prixUnitaire: p.prixAchat,
      sousTotal: 30 * p.prixAchat,
    };
  });
  const totalRea = ligneRea.reduce((s, l) => s + l.sousTotal, 0);
  await prisma.commandeAchat.create({
    data: {
      numero: numBA2,
      fournisseurId: fournisseurs[2].id,
      boutiqueId: boutique.id,
      date: daysAgoUTC(6, 14),
      statut: StatutCommande.RECUE,
      totalHt: totalRea,
      totalTtc: totalRea,
      modePaiement: ModePaiement.CREDIT_CLIENT,
      echeance: daysAgoUTC(-20, 12),
      utilisateurId: magasinier.id,
      lignes: { create: ligneRea },
      paiements: {
        create: {
          sens: SensPaiement.SORTIE,
          montant: Math.round(totalRea * 0.5),
          mode: ModePaiement.VIREMENT,
          date: daysAgoUTC(6, 15),
          utilisateurId: comptable.id,
          fournisseurId: fournisseurs[2].id,
        },
      },
    },
  });
  for (const [idx, l] of ligneRea.entries()) {
    const p = produits.get(productList.indexOf(reappro[idx]) + 1)!;
    p.stock += l.quantite;
    await prisma.mouvementStock.create({
      data: {
        produitId: l.produitId,
        type: TypeMouvementStock.ENTREE_ACHAT,
        quantite: l.quantite,
        reference: numBA2,
        utilisateurId: magasinier.id,
        boutiqueId: boutique.id,
        date: daysAgoUTC(6, 14),
        motif: 'Réapprovisionnement',
      },
    });
    await prisma.produit.update({
      where: { id: l.produitId },
      data: { stock: p.stock },
    });
  }

  // ---------------- Ventes ----------------
  const vendeurs = [caissier.id, caissier.id, comptable.id, gerant.id];
  const daySeq = new Map<string, number>();

  async function createVente(args: {
    daysAgo: number;
    hour: number;
    mode: ModePaiement;
    client?: number;
    items: { index: number; qte: number; prix?: number; type: TypeVente }[];
  }) {
    const date = daysAgoUTC(args.daysAgo, args.hour);
    const key = date.toISOString().slice(0, 10);
    const seqV = (daySeq.get(key) ?? 0) + 1;
    daySeq.set(key, seqV);
    const numero = generateNumero('FV', seqV, date);

    const lignes = args.items.map((it) => {
      const def = productList[it.index - 1];
      const id = produits.get(it.index)!.id;
      const prix = it.prix ?? (it.type === TypeVente.GROS ? def.prixGros! : def.prixVente);
      return {
        produitId: id,
        quantite: it.qte,
        prixUnitaire: prix,
        coutUnitaire: def.prixAchat,
        sousTotal: prix * it.qte,
        index: it.index,
      };
    });
    const sousTotal = lignes.reduce((s, l) => s + l.sousTotal, 0);
    const remise = 0;
    const total = sousTotal - remise;
    const aCredit = args.mode === ModePaiement.CREDIT_CLIENT;

    const vente = await prisma.vente.create({
      data: {
        numeroTicket: numero,
        clientId: args.client ?? null,
        utilisateurId: choice(vendeurs),
        boutiqueId: boutique.id,
        date,
        typeVente: lignes.length === 1 ? lignes[0].prix === productList[lignes[0].index - 1].prixVente ? TypeVente.DETAIL : TypeVente.GROS : TypeVente.DETAIL,
        sousTotal,
        remise,
        taxe: 0,
        total,
        modePaiement: args.mode,
        statut: StatutVente.VALIDEE,
        montantEncaisse: aCredit ? 0 : total,
        montantCredit: aCredit ? total : 0,
        lignes: {
          create: lignes.map((l) => ({
            produitId: l.produitId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            coutUnitaire: l.coutUnitaire,
            sousTotal: l.sousTotal,
          })),
        },
      },
      include: { lignes: true },
    });

    if (aCredit && args.client !== undefined) {
      await prisma.paiement.create({
        data: {
          sens: SensPaiement.SORTIE,
          montant: 4000,
          mode: ModePaiement.ESPECES,
          date: daysAgoUTC(Math.max(0, args.daysAgo - 3), 11),
          reference: `Avance client ${numero}`,
          utilisateurId: comptable.id,
          venteId: vente.id,
        },
      });
    } else {
      await prisma.paiement.create({
        data: {
          sens: SensPaiement.ENTREE,
          montant: total,
          mode: args.mode,
          date,
          reference: numero,
          utilisateurId: vente.utilisateurId,
          venteId: vente.id,
        },
      });
    }

    for (const l of vente.lignes) {
      const p = produitsById.get(l.produitId)!;
      p.stock -= l.quantite;
      await prisma.mouvementStock.create({
        data: {
          produitId: l.produitId,
          type: TypeMouvementStock.SORTIE_VENTE,
          quantite: -l.quantite,
          reference: numero,
          utilisateurId: vente.utilisateurId,
          boutiqueId: boutique.id,
          date,
        },
      });
      await prisma.produit.update({
        where: { id: l.produitId },
        data: { stock: p.stock },
      });
    }
    return vente;
  }

  // Aujourd'hui
  await createVente({ daysAgo: 0, hour: 9, mode: ModePaiement.ESPECES, items: [{ index: 3, qte: 2 }, { index: 16, qte: 3 }] });
  await createVente({ daysAgo: 0, hour: 11, mode: ModePaiement.MOBILE_MONEY, client: clients[1].id, items: [{ index: 12, qte: 1 }, { index: 11, qte: 2 }] });
  await createVente({ daysAgo: 0, hour: 14, mode: ModePaiement.CARTE, items: [{ index: 6, qte: 1 }] });
  await createVente({ daysAgo: 0, hour: 16, mode: ModePaiement.ESPECES, client: clients[0].id, items: [{ index: 4, qte: 1 }, { index: 9, qte: 1 }] });

  // Semaine en cours
  await createVente({ daysAgo: 1, hour: 10, mode: ModePaiement.ESPECES, items: [{ index: 1, qte: 1 }, { index: 2, qte: 1 }] });
  await createVente({ daysAgo: 1, hour: 15, mode: ModePaiement.MOBILE_MONEY, client: clients[2].id, items: [{ index: 15, qte: 1 }, { index: 14, qte: 2 }] });
  await createVente({ daysAgo: 2, hour: 11, mode: ModePaiement.ESPECES, client: clients[3].id, items: [{ index: 10, qte: 2 }] });
  await createVente({ daysAgo: 3, hour: 12, mode: ModePaiement.CREDIT_CLIENT, client: clients[4].id, items: [{ index: 12, qte: 1 }] });
  await createVente({ daysAgo: 4, hour: 10, mode: ModePaiement.ESPECES, items: [{ index: 7, qte: 2 }, { index: 8, qte: 1 }] });

  // Mois en cours (avant la semaine)
  await createVente({ daysAgo: 8, hour: 12, mode: ModePaiement.CREDIT_CLIENT, client: clients[0].id, items: [{ index: 13, qte: 1 }] });
  await createVente({ daysAgo: 10, hour: 16, mode: ModePaiement.ESPECES, client: clients[1].id, items: [{ index: 5, qte: 1 }, { index: 16, qte: 4 }] });
  await createVente({ daysAgo: 14, hour: 11, mode: ModePaiement.MOBILE_MONEY, items: [{ index: 6, qte: 2 }] });
  await createVente({ daysAgo: 18, hour: 13, mode: ModePaiement.ESPECES, items: [{ index: 11, qte: 3 }, { index: 12, qte: 2 }] });
  await createVente({ daysAgo: 22, hour: 10, mode: ModePaiement.ESPECES, client: clients[2].id, items: [{ index: 1, qte: 2 }] });
  await createVente({ daysAgo: 25, hour: 15, mode: ModePaiement.CARTE, items: [{ index: 8, qte: 2 }, { index: 6, qte: 1 }] });

  // ---------------- Retour vente ----------------
  const dateRetour = daysAgoUTC(2, 17);
  const retour = await prisma.retour.create({
    data: {
      numero: generateNumero('RT', 1, dateRetour),
      type: TypeRetour.VENTE,
      date: dateRetour,
      motif: 'T-shirt défectueux (couture)',
      montant: 3500,
      statut: StatutRetour.VALIDE,
      utilisateurId: caissier.id,
      lignes: {
        create: [
          {
            produitId: produits.get(1)!.id,
            quantite: 1,
            prixUnitaire: 3500,
            sousTotal: 3500,
          },
        ],
      },
    },
  });
  const p3 = produits.get(1)!;
  p3.stock += 1;
  await prisma.mouvementStock.create({
    data: {
      produitId: p3.id,
      type: TypeMouvementStock.RETOUR_VENTE,
      quantite: 1,
      reference: retour.numero,
      utilisateurId: caissier.id,
      boutiqueId: boutique.id,
      date: dateRetour,
      motif: 'Retour client',
    },
  });
  await prisma.produit.update({ where: { id: p3.id }, data: { stock: p3.stock } });
  const targetVente = await prisma.vente.findMany({ where: { modePaiement: ModePaiement.ESPECES }, orderBy: { date: 'desc' } });
  if (targetVente[0]) {
    await prisma.vente.update({
      where: { id: targetVente[0].id },
      data: { statut: StatutVente.RETOURNEE },
    });
    await prisma.paiement.create({
      data: {
        sens: SensPaiement.SORTIE,
        montant: 3500,
        mode: ModePaiement.ESPECES,
        date: dateRetour,
        reference: `Remboursement ${retour.numero}`,
        utilisateurId: caissier.id,
        venteId: targetVente[0].id,
      },
    });
  }

  // ---------------- Dépenses ----------------
  const catLoyer = await prisma.depenseCategorie.create({ data: { nom: 'Loyer' } });
  const catTransport = await prisma.depenseCategorie.create({ data: { nom: 'Transport' } });
  const catElectricite = await prisma.depenseCategorie.create({ data: { nom: 'Électricité' } });
  const catSalaires = await prisma.depenseCategorie.create({ data: { nom: 'Salaires' } });
  const catEmballages = await prisma.depenseCategorie.create({ data: { nom: 'Emballages' } });
  const depenses = [
    { categorieId: catLoyer.id, montant: 150000, description: 'Loyer mensuel du local', date: daysAgoUTC(5, 8) },
    { categorieId: catElectricite.id, montant: 22000, description: 'Facture Senelec', date: daysAgoUTC(12, 9) },
    { categorieId: catSalaires.id, montant: 120000, description: 'Salaire vendeuse Awa', date: daysAgoUTC(3, 9) },
    { categorieId: catTransport.id, montant: 8000, description: 'Transport marchandises', date: daysAgoUTC(6, 8) },
    { categorieId: catEmballages.id, montant: 4500, description: 'Sacs et emballages', date: daysAgoUTC(2, 8) },
    { categorieId: catTransport.id, montant: 6000, description: 'Carburant livraison', date: daysAgoUTC(9, 10) },
  ];
  for (const d of depenses) {
    await prisma.depense.create({
      data: {
        categorieId: d.categorieId,
        montant: d.montant,
        description: d.description,
        date: d.date,
        modePaiement: ModePaiement.ESPECES,
        utilisateurId: comptable.id,
        boutiqueId: boutique.id,
      },
    });
  }

  // ---------------- Audit ----------------
  const audits = [
    { action: 'SEED_INIT', entite: 'Boutique', entiteId: boutique.id, details: { message: 'Initialisation des données de démonstration' } },
    { action: 'VENTE_CREEE', entite: 'Vente', details: { n: 16 } },
    { action: 'ACHAT_RECU', entite: 'CommandeAchat', details: { numeros: [numBA, numBA2] } },
  ];
  for (const a of audits) {
    await prisma.auditLog.create({
      data: { utilisateurId: admin.id, action: a.action, entite: a.entite, entiteId: a.entiteId, details: a.details },
    });
  }

  console.log('✅ Données de démonstration insérées.');
  console.log('   Comptes : admin@boutique.test / gerant@boutique.test / caissier@boutique.test');
  console.log('   magasinier@boutique.test / comptable@boutique.test — mot de passe : admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });