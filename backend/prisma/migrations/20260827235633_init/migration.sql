-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GERANT', 'CAISSIER', 'MAGASINIER', 'COMPTABLE');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('BROUILLON', 'VALIDEE', 'ANNULEE', 'RETOURNEE');

-- CreateEnum
CREATE TYPE "TypeVente" AS ENUM ('DETAIL', 'GROS', 'PERSONNALISE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY', 'CREDIT_CLIENT');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('BROUILLON', 'ENVOYEE', 'RECUE', 'PARTIELLEMENT_RECUE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeMouvementStock" AS ENUM ('ENTREE_ACHAT', 'SORTIE_VENTE', 'AJUSTEMENT', 'INVENTAIRE', 'RETOUR_VENTE', 'RETOUR_FOURNISSEUR', 'PERTE', 'TRANSFERT');

-- CreateEnum
CREATE TYPE "SensPaiement" AS ENUM ('ENTREE', 'SORTIE');

-- CreateEnum
CREATE TYPE "TypeRetour" AS ENUM ('VENTE', 'ACHAT');

-- CreateEnum
CREATE TYPE "StatutRetour" AS ENUM ('VALIDE', 'ANNULE');

-- CreateEnum
CREATE TYPE "StatutInventaire" AS ENUM ('BROUILLON', 'VALIDE');

-- CreateEnum
CREATE TYPE "StatutCaisse" AS ENUM ('OUVERTE', 'FERMEE');

-- CreateEnum
CREATE TYPE "SensMouvementCaisse" AS ENUM ('ENTREE', 'SORTIE');

-- CreateTable
CREATE TABLE "boutiques" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boutiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CAISSIER',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "boutiqueId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "parentId" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marques" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" SERIAL NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "marqueId" INTEGER,
    "reference" TEXT NOT NULL,
    "codeBarre" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "unite" TEXT NOT NULL DEFAULT 'pièce',
    "prixAchat" INTEGER NOT NULL DEFAULT 0,
    "prixVente" INTEGER NOT NULL DEFAULT 0,
    "prixGros" INTEGER,
    "prixPromo" INTEGER,
    "stockMin" INTEGER NOT NULL DEFAULT 0,
    "emplacement" TEXT,
    "suitLots" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit_variantes" (
    "id" SERIAL NOT NULL,
    "produitId" INTEGER NOT NULL,
    "nomOption" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "prixAjustement" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "produit_variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" SERIAL NOT NULL,
    "produitId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "datePeremption" TIMESTAMP(3),
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "entreprise" TEXT,
    "contact" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "pointsFidelite" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes_achats" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "fournisseurId" INTEGER NOT NULL,
    "boutiqueId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutCommande" NOT NULL DEFAULT 'BROUILLON',
    "totalHt" INTEGER NOT NULL DEFAULT 0,
    "remise" INTEGER NOT NULL DEFAULT 0,
    "fraisTransport" INTEGER NOT NULL DEFAULT 0,
    "taxe" INTEGER NOT NULL DEFAULT 0,
    "totalTtc" INTEGER NOT NULL DEFAULT 0,
    "modePaiement" "ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "echeance" TIMESTAMP(3),
    "utilisateurId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandes_achats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_achat_lignes" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "sousTotal" INTEGER NOT NULL,

    CONSTRAINT "commande_achat_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" SERIAL NOT NULL,
    "numeroTicket" TEXT NOT NULL,
    "clientId" INTEGER,
    "utilisateurId" INTEGER NOT NULL,
    "boutiqueId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "typeVente" "TypeVente" NOT NULL DEFAULT 'DETAIL',
    "sousTotal" INTEGER NOT NULL DEFAULT 0,
    "remise" INTEGER NOT NULL DEFAULT 0,
    "taxe" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "modePaiement" "ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "statut" "StatutVente" NOT NULL DEFAULT 'BROUILLON',
    "montantEncaisse" INTEGER NOT NULL DEFAULT 0,
    "montantCredit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vente_lignes" (
    "id" SERIAL NOT NULL,
    "venteId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "varianteDetail" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "coutUnitaire" INTEGER NOT NULL DEFAULT 0,
    "sousTotal" INTEGER NOT NULL,

    CONSTRAINT "vente_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" SERIAL NOT NULL,
    "sens" "SensPaiement" NOT NULL,
    "montant" INTEGER NOT NULL,
    "mode" "ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "utilisateurId" INTEGER,
    "venteId" INTEGER,
    "clientId" INTEGER,
    "commandeAchatId" INTEGER,
    "fournisseurId" INTEGER,
    "depenseId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retours" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "TypeRetour" NOT NULL,
    "venteId" INTEGER,
    "commandeAchatId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT NOT NULL,
    "montant" INTEGER NOT NULL DEFAULT 0,
    "statut" "StatutRetour" NOT NULL DEFAULT 'VALIDE',
    "utilisateurId" INTEGER NOT NULL,

    CONSTRAINT "retours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retour_lignes" (
    "id" SERIAL NOT NULL,
    "retourId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" INTEGER NOT NULL DEFAULT 0,
    "sousTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "retour_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" SERIAL NOT NULL,
    "produitId" INTEGER NOT NULL,
    "type" "TypeMouvementStock" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" TEXT,
    "reference" TEXT,
    "utilisateurId" INTEGER,
    "boutiqueId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventaires" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutInventaire" NOT NULL DEFAULT 'BROUILLON',
    "utilisateurId" INTEGER NOT NULL,
    "boutiqueId" INTEGER,

    CONSTRAINT "inventaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventaire_lignes" (
    "id" SERIAL NOT NULL,
    "inventaireId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,
    "qteTheorique" INTEGER NOT NULL,
    "qteReelle" INTEGER NOT NULL,
    "ecart" INTEGER NOT NULL,

    CONSTRAINT "inventaire_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depenses" (
    "id" SERIAL NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" "ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "utilisateurId" INTEGER,
    "boutiqueId" INTEGER,

    CONSTRAINT "depenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depenses_categories" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depenses_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caisse_sessions" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "boutiqueId" INTEGER,
    "dateOuverture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFermeture" TIMESTAMP(3),
    "fondDeCaisse" INTEGER NOT NULL DEFAULT 0,
    "montantTheorique" INTEGER NOT NULL DEFAULT 0,
    "montantReel" INTEGER,
    "ecart" INTEGER,
    "statut" "StatutCaisse" NOT NULL DEFAULT 'OUVERTE',

    CONSTRAINT "caisse_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_caisse" (
    "id" SERIAL NOT NULL,
    "caisseId" INTEGER NOT NULL,
    "sens" "SensMouvementCaisse" NOT NULL,
    "montant" INTEGER NOT NULL,
    "motif" TEXT,
    "reference" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_audit" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" INTEGER,
    "details" JSONB,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_parentId_key" ON "categories"("nom", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "marques_nom_key" ON "marques"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "produits_reference_key" ON "produits"("reference");

-- CreateIndex
CREATE INDEX "produits_categorieId_idx" ON "produits"("categorieId");

-- CreateIndex
CREATE INDEX "produits_codeBarre_idx" ON "produits"("codeBarre");

-- CreateIndex
CREATE INDEX "lots_produitId_datePeremption_idx" ON "lots"("produitId", "datePeremption");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_achats_numero_key" ON "commandes_achats"("numero");

-- CreateIndex
CREATE INDEX "commandes_achats_fournisseurId_date_idx" ON "commandes_achats"("fournisseurId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ventes_numeroTicket_key" ON "ventes"("numeroTicket");

-- CreateIndex
CREATE INDEX "ventes_utilisateurId_date_idx" ON "ventes"("utilisateurId", "date");

-- CreateIndex
CREATE INDEX "ventes_clientId_idx" ON "ventes"("clientId");

-- CreateIndex
CREATE INDEX "paiements_date_idx" ON "paiements"("date");

-- CreateIndex
CREATE UNIQUE INDEX "retours_numero_key" ON "retours"("numero");

-- CreateIndex
CREATE INDEX "retours_date_idx" ON "retours"("date");

-- CreateIndex
CREATE INDEX "mouvements_stock_produitId_date_idx" ON "mouvements_stock"("produitId", "date");

-- CreateIndex
CREATE INDEX "mouvements_stock_type_idx" ON "mouvements_stock"("type");

-- CreateIndex
CREATE INDEX "depenses_categorieId_date_idx" ON "depenses"("categorieId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "depenses_categories_nom_key" ON "depenses_categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "parametres_cle_key" ON "parametres"("cle");

-- CreateIndex
CREATE INDEX "journal_audit_entite_entiteId_idx" ON "journal_audit"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "journal_audit_date_idx" ON "journal_audit"("date");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "marques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_variantes" ADD CONSTRAINT "produit_variantes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_achats" ADD CONSTRAINT "commandes_achats_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_achats" ADD CONSTRAINT "commandes_achats_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_achats" ADD CONSTRAINT "commandes_achats_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_achat_lignes" ADD CONSTRAINT "commande_achat_lignes_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes_achats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_achat_lignes" ADD CONSTRAINT "commande_achat_lignes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente_lignes" ADD CONSTRAINT "vente_lignes_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente_lignes" ADD CONSTRAINT "vente_lignes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_commandeAchatId_fkey" FOREIGN KEY ("commandeAchatId") REFERENCES "commandes_achats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_depenseId_fkey" FOREIGN KEY ("depenseId") REFERENCES "depenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retours" ADD CONSTRAINT "retours_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retours" ADD CONSTRAINT "retours_commandeAchatId_fkey" FOREIGN KEY ("commandeAchatId") REFERENCES "commandes_achats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retours" ADD CONSTRAINT "retours_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retour_lignes" ADD CONSTRAINT "retour_lignes_retourId_fkey" FOREIGN KEY ("retourId") REFERENCES "retours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retour_lignes" ADD CONSTRAINT "retour_lignes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventaires" ADD CONSTRAINT "inventaires_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventaires" ADD CONSTRAINT "inventaires_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventaire_lignes" ADD CONSTRAINT "inventaire_lignes_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "inventaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventaire_lignes" ADD CONSTRAINT "inventaire_lignes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "depenses_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caisse_sessions" ADD CONSTRAINT "caisse_sessions_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caisse_sessions" ADD CONSTRAINT "caisse_sessions_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_caisse" ADD CONSTRAINT "mouvements_caisse_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "caisse_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
