const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body?.message)
        ? body.message.join(", ")
        : (body?.message ?? message);
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const AuthAPI = {
  login: (email: string, motDePasse: string) =>
    api<{ user: import("./types").User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, motDePasse }),
    }),
  logout: () =>
    api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => api<import("./types").User>("/auth/me"),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    api<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse }),
    }),
  };

export interface ProduitFilters {
  search?: string;
  categorieId?: number;
  marqueId?: number;
  actif?: boolean;
  basStock?: boolean;
  take?: number;
}

export const ProduitsAPI = {
  list: (filters: ProduitFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.categorieId) params.set("categorieId", String(filters.categorieId));
    if (filters.marqueId) params.set("marqueId", String(filters.marqueId));
    if (filters.actif !== undefined) params.set("actif", String(filters.actif));
    if (filters.basStock) params.set("basStock", "true");
    if (filters.take) params.set("take", String(filters.take));
    const qs = params.toString();
    return api<import("./types").Produit[]>(`/produits${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) =>
    api<import("./types").Produit>(`/produits/${id}`),
  create: (data: Record<string, unknown>) =>
    api<import("./types").Produit>("/produits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Record<string, unknown>) =>
    api<import("./types").Produit>(`/produits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  addVariante: (id: number, data: { nomOption: string; valeur: string; prixAjustement?: number }) =>
    api<import("./types").ProduitVariante>(`/produits/${id}/variantes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeVariante: (id: number, vid: number) =>
    api<{ ok: boolean }>(`/produits/${id}/variantes/${vid}`, { method: "DELETE" }),
  addLot: (id: number, data: { numero: string; datePeremption?: string; quantite?: number }) =>
    api<import("./types").Lot>(`/produits/${id}/lots`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLot: (id: number, lotId: number, data: Record<string, unknown>) =>
    api<import("./types").Lot>(`/produits/${id}/lots/${lotId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  removeLot: (id: number, lotId: number) =>
    api<{ ok: boolean }>(`/produits/${id}/lots/${lotId}`, { method: "DELETE" }),
};

export const CategoriesAPI = {
  list: () => api<import("./types").Categorie[]>("/categories"),
  create: (data: { nom: string; parentId?: number | null; description?: string }) =>
    api<import("./types").Categorie>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { nom?: string; parentId?: number | null; description?: string }) =>
    api<import("./types").Categorie>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    api<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),
};

export const MarquesAPI = {
  list: () => api<import("./types").Marque[]>("/marques"),
  create: (nom: string) =>
    api<import("./types").Marque>("/marques", {
      method: "POST",
      body: JSON.stringify({ nom }),
    }),
  update: (id: number, nom: string) =>
    api<import("./types").Marque>(`/marques/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nom }),
    }),
  remove: (id: number) =>
    api<{ ok: boolean }>(`/marques/${id}`, { method: "DELETE" }),
};

export const FournisseursAPI = {
  list: () => api<import("./types").Fournisseur[]>("/fournisseurs"),
  get: (id: number) =>
    api<import("./types").Fournisseur & {
      commandes?: import("./types").CommandeAchat[];
      paiements?: import("./types").Paiement[];
    }>(`/fournisseurs/${id}`),
  create: (data: Record<string, unknown>) =>
    api<import("./types").Fournisseur>("/fournisseurs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Record<string, unknown>) =>
    api<import("./types").Fournisseur>(`/fournisseurs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    api<{ ok: boolean }>(`/fournisseurs/${id}`, { method: "DELETE" }),
};

export interface AchatsFilters {
  statut?: string;
  fournisseurId?: number;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
}

export const AchatsAPI = {
  list: (filters: AchatsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.statut) params.set("statut", filters.statut);
    if (filters.fournisseurId)
      params.set("fournisseurId", String(filters.fournisseurId));
    if (filters.search) params.set("search", filters.search);
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    const qs = params.toString();
    return api<import("./types").CommandeAchat[]>(
      `/achats${qs ? `?${qs}` : ""}`,
    );
  },
  get: (id: number) =>
    api<import("./types").CommandeAchat>(`/achats/${id}`),
  create: (data: Record<string, unknown>) =>
    api<import("./types").CommandeAchat>("/achats", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addLigne: (id: number, data: Record<string, unknown>) =>
    api<import("./types").CommandeAchat>(`/achats/${id}/lignes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeLigne: (id: number, ligneId: number) =>
    api<import("./types").CommandeAchat>(`/achats/${id}/lignes/${ligneId}`, {
      method: "DELETE",
    }),
  valider: (id: number) =>
    api<import("./types").CommandeAchat>(`/achats/${id}/valider`, {
      method: "POST",
    }),
  annuler: (id: number) =>
    api<import("./types").CommandeAchat>(`/achats/${id}/annuler`, {
      method: "POST",
    }),
  receptionner: (id: number, lignes: { ligneId: number; quantiteRecue: number }[]) =>
    api<import("./types").CommandeAchat>(`/achats/${id}/receptionner`, {
      method: "POST",
      body: JSON.stringify({ lignes }),
    }),
  payer: (
    id: number,
    data: { montant: number; mode?: string; date?: string; reference?: string },
  ) =>
    api<import("./types").CommandeAchat>(`/achats/${id}/paiements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  suiviDettes: () =>
    api<
      {
        fournisseur: { id: number; nom: string };
        totalAchats: number;
        totalPaye: number;
        dette: number;
      }[]
    >("/achats/dettes"),
};

export interface StockEtatFilters {
  search?: string;
  categorieId?: number;
  marqueId?: number;
  basStock?: boolean;
  rupture?: boolean;
}

export const StockAPI = {
  etat: (filters: StockEtatFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.categorieId)
      params.set("categorieId", String(filters.categorieId));
    if (filters.marqueId) params.set("marqueId", String(filters.marqueId));
    if (filters.basStock) params.set("basStock", "true");
    if (filters.rupture) params.set("rupture", "true");
    const qs = params.toString();
    return api<import("./types").StockEtatItem[]>(
      `/stock/etat${qs ? `?${qs}` : ""}`,
    );
  },
  mouvements: (filters: {
    produitId?: number;
    type?: string;
    dateDebut?: string;
    dateFin?: string;
    take?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.produitId) params.set("produitId", String(filters.produitId));
    if (filters.type) params.set("type", filters.type);
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    if (filters.take) params.set("take", String(filters.take));
    const qs = params.toString();
    return api<
      (import("./types").MouvementStock & {
        produit?: { id: number; nom: string; reference: string };
      })[]
    >(`/stock/mouvements${qs ? `?${qs}` : ""}`);
  },
  ajuster: (data: {
    produitId: number;
    type: string;
    quantite: number;
    motif: string;
    reference?: string;
  }) =>
    api<{ ok: boolean; message: string }>("/stock/ajustements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  inventaires: () =>
    api<import("./types").Inventaire[]>("/stock/inventaires"),
  inventaire: (id: number) =>
    api<import("./types").Inventaire>(`/stock/inventaires/${id}`),
  createInventaire: (lignes: { produitId: number; qteReelle: number }[]) =>
    api<import("./types").Inventaire>("/stock/inventaires", {
      method: "POST",
      body: JSON.stringify(lignes.length ? { lignes } : {}),
    }),
  validerInventaire: (id: number) =>
    api<import("./types").Inventaire>(`/stock/inventaires/${id}/valider`, {
      method: "POST",
    }),
};

export const ClientsAPI = {
  list: (search?: string) =>
    api<import("./types").Client[]>(
      `/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  get: (id: number) =>
    api<
      import("./types").Client & {
        ventes?: (import("./types").Vente & { _count?: { lignes: number } })[];
        paiements?: import("./types").Paiement[];
      }
    >(`/clients/${id}`),
  create: (data: Record<string, unknown>) =>
    api<import("./types").Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Record<string, unknown>) =>
    api<import("./types").Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    api<{ ok: boolean }>(`/clients/${id}`, { method: "DELETE" }),
};

export interface VentesFilters {
  dateDebut?: string;
  dateFin?: string;
  statut?: string;
  clientId?: number;
  caissierId?: number;
  search?: string;
}

export const VentesAPI = {
  list: (filters: VentesFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    if (filters.statut) params.set("statut", filters.statut);
    if (filters.clientId) params.set("clientId", String(filters.clientId));
    if (filters.caissierId)
      params.set("caissierId", String(filters.caissierId));
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return api<
      (import("./types").Vente & { _count?: { lignes: number; retours: number } })[]
    >(`/ventes${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) =>
    api<import("./types").Vente>(`/ventes/${id}`),
  create: (data: Record<string, unknown>) =>
    api<import("./types").Vente>("/ventes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  payer: (id: number, data: { montant: number; mode?: string; date?: string }) =>
    api<import("./types").Vente>(`/ventes/${id}/paiements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  annuler: (id: number) =>
    api<import("./types").Vente>(`/ventes/${id}/annuler`, {
      method: "POST",
    }),
  retourner: (
    id: number,
    data: {
      motif: string;
      lignes: { produitId: number; quantite: number; prixUnitaire: number }[];
    },
  ) =>
    api<import("./types").Vente>(`/ventes/${id}/retours`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const DepensesAPI = {
  list: (filters: {
    categorieId?: number;
    dateDebut?: string;
    dateFin?: string;
    search?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.categorieId)
      params.set("categorieId", String(filters.categorieId));
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return api<{ liste: import("./types").Depense[]; total: number }>(
      `/depenses${qs ? `?${qs}` : ""}`,
    );
  },
  categories: () =>
    api<(import("./types").DepenseCategorie & { totalDepenses: number })[]>(
      "/depenses/categories",
    ),
  create: (data: Record<string, unknown>) =>
    api<import("./types").Depense>("/depenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    api<{ ok: boolean }>(`/depenses/${id}`, { method: "DELETE" }),
};

export const CaisseAPI = {
  etat: () =>
    api<{
      ouverte: boolean;
      session: (import("./types").CaisseSession & {
        mouvements?: import("./types").MouvementCaisse[];
        entree: number;
        sortie: number;
      }) | null;
    }>("/caisse"),
  jour: (date?: string) =>
    api<(import("./types").CaisseSession & {
      entree: number;
      sortie: number;
      mouvements?: import("./types").MouvementCaisse[];
    })[]>(`/caisse/jour${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  ouvrir: (fondDeCaisse: number) =>
    api<{ ouverte: boolean }>("/caisse/ouvrir", {
      method: "POST",
      body: JSON.stringify({ fondDeCaisse }),
    }),
  fermer: (montantReel: number, observation?: string) =>
    api<import("./types").CaisseSession>("/caisse/fermer", {
      method: "POST",
      body: JSON.stringify({ montantReel, observation }),
    }),
  mouvement: (data: { sens: string; montant: number; motif: string }) =>
    api<{ ouverte: boolean }>("/caisse/mouvements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface RapportsFilters {
  dateDebut?: string;
  dateFin?: string;
}

export const RapportsAPI = {
  overview: (filters: RapportsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    const qs = params.toString();
    return api<import("./types").RapportOverview>(
      `/rapports/overview${qs ? `?${qs}` : ""}`,
    );
  },
  ventes: (filters: RapportsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    const qs = params.toString();
    return api<{ jours: import("./types").RapportVenteJour[]; total: number }>(
      `/rapports/ventes${qs ? `?${qs}` : ""}`,
    );
  },
  produits: (filters: RapportsFilters = {}, take = 10) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    if (take) params.set("take", String(take));
    const qs = params.toString();
    return api<import("./types").RapportProduit[]>(
      `/rapports/ventes/produits${qs ? `?${qs}` : ""}`,
    );
  },
  categories: (filters: RapportsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    const qs = params.toString();
    return api<import("./types").RapportGroupe[]>(
      `/rapports/ventes/categories${qs ? `?${qs}` : ""}`,
    );
  },
  marques: (filters: RapportsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    const qs = params.toString();
    return api<import("./types").RapportGroupe[]>(
      `/rapports/ventes/marques${qs ? `?${qs}` : ""}`,
    );
  },
  clients: (filters: RapportsFilters = {}, take = 10) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    if (take) params.set("take", String(take));
    const qs = params.toString();
    return api<import("./types").RapportClient[]>(
      `/rapports/ventes/clients${qs ? `?${qs}` : ""}`,
    );
  },
  achats: (filters: RapportsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters.dateFin) params.set("dateFin", filters.dateFin);
    const qs = params.toString();
    return api<import("./types").RapportAchats>(
      `/rapports/achats${qs ? `?${qs}` : ""}`,
    );
  },
  stock: () => api<import("./types").RapportStock>("/rapports/stock"),
};