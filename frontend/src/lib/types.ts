export type Role =
  | "ADMIN"
  | "GERANT"
  | "CAISSIER"
  | "MAGASINIER"
  | "COMPTABLE";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gérant",
  CAISSIER: "Caissier/Vendeur",
  MAGASINIER: "Magasinier",
  COMPTABLE: "Comptable",
};

export interface User {
  id: number;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
  boutiqueId: number | null;
  createdAt: string;
  updatedAt: string;
  boutique?: { id: number; nom: string } | null;
}

export interface Parametre {
  cle: string;
  valeur: string;
  description: string | null;
}

export interface TopProduit {
  produit: { id: number; nom: string; reference: string };
  quantite: number;
  montant: number;
}

export interface ProduitStockAlerte {
  id: number;
  nom: string;
  reference: string;
  stock: number;
  stockMin: number;
}

export interface DashboardSummary {
  date: string;
  ca: { jour: number; semaine: number; mois: number };
  ventes: { jour: number; semaine: number; mois: number };
  benefice: { jour: number; mois: number };
  topProduits: TopProduit[];
  stocks: {
    rupture: number;
    bas: ProduitStockAlerte[];
    totalProduits: number;
  };
  achatsMois: number;
  depensesMois: number;
  dettesFournisseurs: number;
  creditsClients: number;
}

export interface Categorie {
  id: number;
  nom: string;
  parentId: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: number; nom: string } | null;
  _count?: { produits: number; sousCategories: number };
}

export interface Marque {
  id: number;
  nom: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProduitVariante {
  id: number;
  nomOption: string;
  valeur: string;
  prixAjustement: number;
}

export interface Lot {
  id: number;
  produitId: number;
  numero: string;
  datePeremption: string | null;
  quantite: number;
}

export interface MouvementStock {
  id: number;
  produitId: number;
  type: string;
  quantite: number;
  motif: string | null;
  reference: string | null;
  date: string;
  utilisateur?: { nom: string } | null;
}

export interface Produit {
  id: number;
  reference: string;
  codeBarre: string | null;
  nom: string;
  description: string | null;
  image: string | null;
  unite: string;
  prixAchat: number;
  prixVente: number;
  prixGros: number | null;
  prixPromo: number | null;
  stock: number;
  stockMin: number;
  emplacement: string | null;
  suitLots: boolean;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  categorieId: number;
  marqueId: number | null;
  categorie?: { id: number; nom: string; parent?: { nom: string } | null } | null;
  marque?: { id: number; nom: string } | null;
  variantes?: ProduitVariante[];
  lots?: Lot[];
  mouvementsStock?: MouvementStock[];
}

// ---------------------------------------------------------------------------
// Phases 3 & 4 : fournisseurs, achats, stock, clients, ventes
// ---------------------------------------------------------------------------

export const STATUT_COMMANDE: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  RECUE: "Reçue",
  PARTIELLEMENT_RECUE: "Partiellement reçue",
  ANNULEE: "Annulée",
};

export const STATUT_VENTE: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
  RETOURNEE: "Retournée",
};

export const MODE_PAIEMENT: Record<string, string> = {
  ESPECES: "Espèces",
  CARTE: "Carte",
  VIREMENT: "Virement",
  MOBILE_MONEY: "Mobile Money",
  CREDIT_CLIENT: "Crédit client",
};

export const TYPE_VENTE: Record<string, string> = {
  DETAIL: "Détail",
  GROS: "Gros",
  PERSONNALISE: "Personnalisé",
};

export const TYPE_MOUVEMENT: Record<string, string> = {
  ENTREE_ACHAT: "Entrée achat",
  SORTIE_VENTE: "Sortie vente",
  AJUSTEMENT: "Ajustement",
  INVENTAIRE: "Inventaire",
  RETOUR_VENTE: "Retour vente",
  RETOUR_FOURNISSEUR: "Retour fournisseur",
  PERTE: "Perte",
  TRANSFERT: "Transfert",
};

export interface Fournisseur {
  id: number;
  nom: string;
  entreprise: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  typeRistourne: string | null;
  ristourne: number | null;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  totalAchats?: number;
  totalPaye?: number;
  dette?: number;
}

export interface Client {
  id: number;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  plafondCredit: number;
  credit: number;
  pointsFidelite: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  nVentes?: number;
  totalAchats?: number;
}

export interface Paiement {
  id: number;
  sens: string;
  montant: number;
  mode: string;
  date: string;
  reference: string | null;
  utilisateurId: number | null;
  venteId: number | null;
  clientId: number | null;
  commandeAchatId: number | null;
  fournisseurId: number | null;
  utilisateur?: { nom: string } | null;
}

export interface CommandeAchatLigne {
  id: number;
  commandeId: number;
  produitId: number;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
  produit?: { id: number; nom: string; reference: string; unite: string };
}

export interface CommandeAchat {
  id: number;
  numero: string;
  fournisseurId: number;
  boutiqueId: number | null;
  date: string;
  statut: string;
  totalHt: number;
  remise: number;
  fraisTransport: number;
  taxe: number;
  totalTtc: number;
  modePaiement: string;
  echeance: string | null;
  utilisateurId: number;
  createdAt: string;
  updatedAt: string;
  fournisseur?: { id: number; nom: string; entreprise: string | null; telephone: string | null };
  lignes?: CommandeAchatLigne[];
  paiements?: Paiement[];
  retours?: { id: number; numero: string; montant: number; motif: string }[];
  totalPaye?: number;
  resteAPayer?: number;
}

export interface StockEtatItem {
  id: number;
  nom: string;
  reference: string;
  categorie: string | null;
  marque: string | null;
  stock: number;
  stockMin: number;
  unite: string;
  emplacement: string | null;
  valeurStock: number;
}

export interface InventaireLigne {
  id: number;
  inventaireId: number;
  produitId: number;
  qteTheorique: number;
  qteReelle: number;
  ecart: number;
  produit?: { id: number; nom: string; reference: string };
}

export interface Inventaire {
  id: number;
  date: string;
  statut: string;
  utilisateurId: number;
  utilisateur?: { id: number; nom: string };
  lignes?: InventaireLigne[];
}

export interface VenteLigne {
  id: number;
  venteId: number;
  produitId: number;
  varianteDetail: string | null;
  quantite: number;
  prixUnitaire: number;
  coutUnitaire: number;
  sousTotal: number;
  produit?: { id: number; nom: string; reference: string; unite: string };
}

export interface Retour {
  id: number;
  numero: string;
  type: string;
  venteId: number | null;
  commandeAchatId: number | null;
  date: string;
  motif: string;
  montant: number;
  statut: string;
  utilisateurId: number;
  utilisateur?: { id: number; nom: string };
  lignes?: {
    id: number;
    produitId: number;
    quantite: number;
    prixUnitaire: number;
    sousTotal: number;
    produit?: { id: number; nom: string; reference: string };
  }[];
}

export interface Vente {
  id: number;
  numeroTicket: string;
  clientId: number | null;
  utilisateurId: number;
  date: string;
  typeVente: string;
  sousTotal: number;
  remise: number;
  taxe: number;
  total: number;
  modePaiement: string;
  statut: string;
  montantEncaisse: number;
  montantCredit: number;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; nom: string } | null;
  utilisateur?: { id: number; nom: string };
  lignes?: VenteLigne[];
  paiements?: Paiement[];
  retours?: Retour[];
}

// ---------------------------------------------------------------------------
// Phase 5 : dépenses, caisse, rapports
// ---------------------------------------------------------------------------

export interface DepenseCategorie {
  id: number;
  nom: string;
  createdAt: string;
  totalDepenses?: number;
}

export interface Depense {
  id: number;
  categorieId: number;
  montant: number;
  description: string | null;
  date: string;
  modePaiement: string;
  utilisateurId: number | null;
  utilisateur?: { id: number; nom: string } | null;
  categorie?: { id: number; nom: string } | null;
}

export const STATUT_CAISSE: Record<string, string> = {
  OUVERTE: "Ouverte",
  FERMEE: "Fermée",
};

export const SENS_CAISSE: Record<string, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
};

export interface CaisseSession {
  id: number;
  utilisateurId: number;
  dateOuverture: string;
  dateFermeture: string | null;
  fondDeCaisse: number;
  montantTheorique: number;
  montantReel: number | null;
  ecart: number | null;
  statut: string;
  utilisateur?: { id: number; nom: string };
  entree?: number;
  sortie?: number;
  mouvements?: MouvementCaisse[];
}

export interface MouvementCaisse {
  id: number;
  caisseId: number;
  sens: string;
  montant: number;
  motif: string | null;
  reference: string | null;
  date: string;
}

export interface RapportOverview {
  ca: number;
  nombreVentes: number;
  benefice: number;
  beneficeBrut: number;
  depenses: number;
  achats: number;
  unitesVendues: number;
}

export interface RapportVenteJour {
  date: string;
  montant: number;
  quantite: number;
  nombre: number;
}

export interface RapportProduit {
  produit: { id: number; nom: string; reference: string };
  quantite: number;
  montant: number;
  cout: number;
  benefice: number;
}

export interface RapportGroupe {
  nom: string;
  quantite: number;
  montant: number;
}

export interface RapportClient {
  client: { id: number; nom: string; prenom: string | null; telephone: string | null } | null;
  montant: number;
  nombre: number;
}

export interface RapportAchats {
  totalAchats: number;
  totalPaye: number;
  dette: number;
  nombreCommandes: number;
  parFournisseur: { nom: string; montant: number }[];
}

export interface RapportStock {
  valeur: number;
  totalProduits: number;
  rupture: number;
  bas: number;
}