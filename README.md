# Gestion AETV — Achats, Ventes & Stock

Application web de gestion commerciale (boutique) : catalogue, fournisseurs,
achats, point de vente, clients, stocks, dépenses, caisse et rapports.

## Stack

| Brique | Technologie |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | NestJS 12 + Prisma ORM |
| Base de données | PostgreSQL 16 (Docker) |
| Auth | JWT (cookie httpOnly) + rôles & permissions |

## Démarrage rapide

1. **Lancer PostgreSQL** (Docker) — port hôte **5433** :

   ```bash
   docker compose up -d db
   ```

2. **Backend** (`backend/`) :

   ```bash
   npm install
   npx prisma migrate deploy   # applique les migrations
   npm run seed                # données de démonstration
   npm run start:dev           # API sur http://localhost:3001/api
   ```

3. **Frontend** (`frontend/`) :

   ```bash
   npm install
   npm run dev                 # application sur http://localhost:3000
   ```

Comptes de démonstration (mot de passe `admin123`) :
`admin@boutique.test`, `gerant@boutique.test`, `caissier@boutique.test`,
`magasinier@boutique.test`, `comptable@boutique.test`.

## Structure

```
backend/   API NestJS (auth, rôles, catalogue, achats, ventes, stock, rapports)
frontend/  Application Next.js (POS, tableaux, formulaires, exports)
docs/      Cahier des charges, schéma BDD, API, guide de déploiement
```

## Scripts utiles

- Backend : `npm run seed`, `npm run start:dev`, `npm run build`, `npm run lint`, `npm test`
- Frontend : `npm run dev`, `npm run build`, `npm run lint`