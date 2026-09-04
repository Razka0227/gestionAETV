import { Role } from '@prisma/client';

/**
 * Matrice des permissions par rôle.
 * Chaque permission décrit une action précise du système.
 * L'administrateur a implicitement toutes les permissions.
 */
export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [],
  GERANT: [
    'produits.view',
    'produits.create',
    'produits.edit',
    'fournisseurs.view',
    'fournisseurs.create',
    'fournisseurs.edit',
    'clients.view',
    'achats.view',
    'achats.create',
    'achats.receive',
    'achats.pay',
    'ventes.view',
    'ventes.create',
    'ventes.remise',
    'ventes.annuler',
    'ventes.retourner',
    'ventes.encaisser',
    'stock.view',
    'stock.mouvements',
    'stock.ajuster',
    'stock.inventaire',
    'stock.transfert',
    'depenses.view',
    'depenses.create',
    'depenses.categories',
    'caisse.open',
    'caisse.close',
    'caisse.view',
    'rapports.voir',
    'rapports.export',
  ],
  CAISSIER: [
    'produits.view',
    'clients.view',
    'clients.create',
    'clients.edit',
    'ventes.view',
    'ventes.create',
    'ventes.remise',
    'ventes.encaisser',
    'stock.view',
    'caisse.open',
    'caisse.close',
    'caisse.view',
  ],
  MAGASINIER: [
    'produits.view',
    'produits.create',
    'produits.edit',
    'fournisseurs.view',
    'achats.view',
    'achats.receive',
    'stock.view',
    'stock.mouvements',
    'stock.ajuster',
    'stock.inventaire',
    'stock.transfert',
  ],
  COMPTABLE: [
    'produits.view',
    'clients.view',
    'fournisseurs.view',
    'achats.view',
    'ventes.view',
    'stock.view',
    'depenses.view',
    'depenses.create',
    'depenses.categories',
    'caisse.open',
    'caisse.close',
    'caisse.view',
    'rapports.voir',
    'rapports.export',
    'ventes.encaisser',
  ],
};

export function hasPermissions(role: Role, required: string[]): boolean {
  if (role === Role.ADMIN) return true;
  const owned = PERMISSIONS[role] ?? [];
  return required.every((r) => owned.includes(r));
}