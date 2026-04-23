/**
 * YukpoPro Mobile — API Client
 * Même interface que le web, adaptée pour React Native
 */
import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";

// ── Config ────────────────────────────────────────────────────────────────────

// En développement : pointer vers votre backend local
// En production : URL de production
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.100:8000/api/v1";

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("yukpopro_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("yukpopro_token");
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await http.post("/auth/login", { username: email, password });
    await SecureStore.setItemAsync("yukpopro_token", data.access_token);
    return data as { access_token: string };
  },

  register: async (payload: { email: string; password: string; nom: string }) => {
    const { data } = await http.post("/auth/register/pro", payload);
    return data;
  },

  me: async () => {
    const { data } = await http.get("/auth/me");
    return data;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("yukpopro_token");
  },
};

// ── Profil Pro ────────────────────────────────────────────────────────────────

export const profilApi = {
  get: async () => {
    const { data } = await http.get("/pro/profil/");
    return data;
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await http.post("/pro/profil/", payload);
    return data;
  },
  update: async (payload: Record<string, unknown>) => {
    const { data } = await http.patch("/pro/profil/", payload);
    return data;
  },
};

// ── Copilote ──────────────────────────────────────────────────────────────────

export const copiloteApi = {
  chat: async (message: string, pays?: string) => {
    const { data } = await http.post("/pro/copilote/chat", { message, pays });
    return data;
  },
  nouveau: async () => {
    await http.post("/pro/copilote/nouveau", {});
  },
  suggestions: async () => {
    const { data } = await http.get("/pro/copilote/suggestions");
    return data;
  },
};

// ── Agent IA ──────────────────────────────────────────────────────────────────

export const agentApi = {
  chat: async (message: string, contexte?: Record<string, unknown>) => {
    const { data } = await http.post("/pro/agent/chat", { message, contexte });
    return data;
  },
  recherche: async (question: string, pays?: string) => {
    const { data } = await http.post("/pro/agent/recherche", { question, pays });
    return data;
  },
};

// ── Générateurs ───────────────────────────────────────────────────────────────

export interface DocumentHistorique {
  id: number;
  titre: string;
  type_doc: "rapport" | "slides" | "traduction" | "autre";
  fichier?: string;
  contenu_source?: string;
  contenu_genere?: string;
  session_id?: string;
  meta: Record<string, unknown>;
  cree_le: string;
  modifie_le: string;
}

export const generateurApi = {
  rapport: async (req: {
    sujet: string;
    type_rapport?: string;
    mode?: string;
    contexte?: string;
    format_sortie?: string;
  }) => {
    const { data } = await http.post("/pro/rapports/generer", req);
    return data as { chemin_fichier?: string; fichier?: string; contenu_markdown?: string };
  },
  slides: async (req: {
    sujet: string;
    type_pres?: string;
    mode?: string;
    contexte?: string;
    format_sortie?: string;
  }) => {
    const { data } = await http.post("/pro/slides/generer", req);
    return data as { chemin_fichier?: string; fichier?: string; contenu_markdown?: string };
  },
  analyserEtGenerer: async (params: {
    instruction: string;
    type_sortie?: "rapport" | "slides";
    type_doc?: string;
    mode?: string;
    format_sortie?: string;
    fichiers: Array<{ uri: string; name: string; type: string }>;
  }) => {
    const form = new FormData();
    form.append("instruction", params.instruction);
    form.append("type_sortie", params.type_sortie ?? "rapport");
    form.append("type_doc", params.type_doc ?? "rapport_analyse");
    form.append("mode", params.mode ?? "standard");
    form.append("format_sortie", params.format_sortie ?? "docx");
    params.fichiers.forEach((f) => {
      // @ts-ignore — React Native FormData
      form.append("fichiers", { uri: f.uri, name: f.name, type: f.type });
    });
    const { data } = await http.post("/pro/analyser-et-generer", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180_000,
    });
    return data as { chemin_fichier?: string; fichier?: string; contenu_markdown?: string; nb_fichiers_analyses?: number };
  },
  traduire: async (req: Record<string, unknown>) => {
    const { data } = await http.post("/pro/traduire", req);
    return data;
  },
  traduireFichier: async (formData: FormData) => {
    const { data } = await http.post("/pro/traduire-fichier", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180_000,
    });
    return data as { texte_traduit: string; langue_source: string; langue_cible: string; nb_mots_source: number; nb_mots_cible: number; chemin_docx?: string };
  },
  historiqueDocuments: async (type_doc?: string): Promise<{ documents: DocumentHistorique[]; total: number }> => {
    const params = type_doc ? { type_doc } : {};
    const { data } = await http.get("/pro/documents/historique", { params });
    return data;
  },
  sauvegarderDocument: async (payload: {
    titre: string;
    type_doc: string;
    fichier?: string;
    contenu_source?: string;
    contenu_genere?: string;
    meta?: Record<string, unknown>;
  }): Promise<DocumentHistorique> => {
    const { data } = await http.post("/pro/documents/", payload);
    return data;
  },
  supprimerDocument: async (id: number): Promise<void> => {
    await http.delete(`/pro/documents/${id}`);
  },
  urlTelechargement: (nom: string) =>
    `${BASE_URL}/pro/generateurs/fichier/${encodeURIComponent(nom)}`,

  convertirFichier: async (formData: FormData): Promise<{
    fichier_converti: string;
    format_source: string;
    format_cible: string;
    taille_octets: number;
  }> => {
    const { data } = await http.post("/pro/convertir-fichier", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
    return data;
  },
};

// ── Chat unifié ───────────────────────────────────────────────────────────────

export const chatApi = {
  send: async (req: { message: string; pays?: string; fichiers?: unknown[] }) => {
    try {
      const { data } = await http.post("/pro/copilote/chat", req);
      return data as { reponse: string; agent_utilise?: string; session_id?: string };
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 422) {
        const { data } = await http.post("/copilote/chat", {
          question: req.message,
          compagnie_id: 1,
        });
        return { reponse: data.reponse || data.message || JSON.stringify(data) };
      }
      throw err;
    }
  },
};

// ── Réunions ──────────────────────────────────────────────────────────────────

export const reunionsApi = {
  transcrireDirect: async (audioUri: string, langue = "auto"): Promise<{
    transcription: string;
    transcription_originale?: string;
    langue_detectee: string;
    traduit: boolean;
  }> => {
    const formData = new FormData();
    const ext = audioUri.split(".").pop()?.toLowerCase() || "m4a";
    // Normaliser le MIME audio
    const mimeMap: Record<string, string> = {
      m4a: "audio/mp4", mp4: "audio/mp4", mp3: "audio/mpeg",
      wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg",
      aac: "audio/aac", "3gp": "audio/3gpp",
    };
    const mime = mimeMap[ext] ?? "audio/mp4";
    // @ts-ignore — React Native FormData accepts { uri, name, type }
    formData.append("audio", { uri: audioUri, name: `enregistrement.${ext}`, type: mime });
    formData.append("langue", langue);
    const { data } = await http.post("/pro/reunions/transcrire-direct", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
    return data;
  },

  genererRapport: async (payload: {
    transcription: string;
    titre?: string;
    participants?: string;
    langue?: string;
    contexte?: string;
    duree_secondes?: number;
  }) => {
    const { data } = await http.post("/pro/reunions/generer-rapport", payload);
    return data as { rapport: string; titre: string; langue: string; fichier?: string; sauvegarde_mes_documents?: boolean };
  },
};

// ── Abonnement ────────────────────────────────────────────────────────────────

// ── Emploi / Veille emploi ────────────────────────────────────────────────────

export const emploiApi = {
  getConfig: async () => {
    const { data } = await http.get("/pro/profil/");
    return data as {
      recherche_emploi_active: boolean;
      frequence_recherche_heures: number;
      profil_recherche_emploi: string;
      derniere_recherche_emploi: string | null;
      offres_emploi_recentes: Array<{
        titre: string; entreprise: string; lieu?: string;
        description?: string; url?: string; source?: string;
        date_pub?: string; score?: number; type_contrat?: string;
      }>;
      cv_disponible?: boolean;
    };
  },

  mettreAJourConfig: async (payload: {
    profil_recherche_emploi?: string;
    frequence_recherche_heures?: number;
  }) => {
    const { data } = await http.put("/pro/profil/", payload);
    return data;
  },

  activerVeille: async () => {
    const { data } = await http.post("/pro/profil/veille-emploi/activer");
    return data;
  },

  desactiverVeille: async () => {
    const { data } = await http.post("/pro/profil/veille-emploi/desactiver");
    return data;
  },

  lancerRecherche: async () => {
    const { data } = await http.post("/pro/profil/veille-emploi/rechercher");
    return { nb_offres: data.nb_offres || 0, offres: data.offres || [] };
  },
};

// ── Marchés Publics ───────────────────────────────────────────────────────────

export const marchesApi = {
  getRecents: async (): Promise<Array<Record<string, any>>> => {
    const { data } = await http.get("/pro/profil/");
    return data.marches_publics_recents || [];
  },

  lancerRecherche: async (): Promise<number> => {
    const { data } = await http.post("/pro/profil/marches/rechercher");
    return data.nb_marches || 0;
  },
};

export const abonnementApi = {
  monAbonnement: async () => {
    const { data } = await http.get("/pro/abonnement/");
    return data;
  },
  plans: async () => {
    const { data } = await http.get("/pro/abonnement/plans");
    return data;
  },
  initierPaiement: async (payload: {
    plan: string;
    operateur: string;
    numero_telephone: string;
    pays?: string;
  }) => {
    const { data } = await http.post("/pro/abonnement/initier", payload);
    return data;
  },
  confirmerPaiement: async (reference_paiement: string, transaction_id?: string) => {
    const { data } = await http.post("/pro/abonnement/confirmer", { reference_paiement, transaction_id });
    return data;
  },
  historique: async () => {
    const { data } = await http.get("/pro/abonnement/historique");
    return data;
  },
  packsCredits: async () => {
    const { data } = await http.get("/pro/abonnement/packs-credits");
    return data;
  },
  initierRecharge: async (payload: { pack_id: string; operateur: string; numero_telephone: string; pays?: string }) => {
    const { data } = await http.post("/pro/abonnement/initier-recharge", payload);
    return data;
  },
  confirmerRecharge: async (reference_paiement: string, transaction_id?: string) => {
    const { data } = await http.post("/pro/abonnement/confirmer-recharge", { reference_paiement, transaction_id });
    return data;
  },
};

// ── Infographie Pro (Bureau partagé YukpoSecrétariat) ───────────────────────

export interface GabaritInfographie {
  cle: string;
  libelle: string;
  categorie: string;
  width_mm: number;
  height_mm: number;
  bleed_mm: number;
  prix_fcfa: number;
  description?: string;
}

export interface SpecificationInfographieData {
  type_gabarit: string;
  titre: string;
  sous_titre?: string;
  corps?: string;
  details: string[];
  palette?: string;
  nom_organisation?: string;
  contact?: string;
  slogan?: string;
  date_evenement?: string;
  lieu?: string;
}

export interface ResultatInfographieReponse {
  pdf_id?: string;
  png_id?: string;
  pdf_base64?: string;
  png_base64?: string;
  prix_gabarit_fcfa: number;
  credits_debites?: number;
  specification: SpecificationInfographieData;
  width_mm: number;
  height_mm: number;
}

export const infographieApi = {
  listerGabarits: async (): Promise<{ gabarits: GabaritInfographie[]; palettes: string[] }> => {
    const { data } = await http.get("/bureau/infographie/gabarits");
    return data;
  },

  genererDepuisBrief: async (payload: {
    brief: string; type_gabarit: string; pays?: string;
  }): Promise<ResultatInfographieReponse> => {
    const { data } = await http.post("/bureau/infographie/generer", payload, { timeout: 120_000 });
    return data;
  },

  genererManuel: async (payload: SpecificationInfographieData): Promise<ResultatInfographieReponse> => {
    const { data } = await http.post("/bureau/infographie/generer-manuel", payload, { timeout: 120_000 });
    return data;
  },

  genererDepuisModele: async (payload: {
    modele: { uri: string; name: string; type: string };
    brief: string;
    type_gabarit: string;
    pays?: string;
  }): Promise<ResultatInfographieReponse> => {
    const form = new FormData();
    // @ts-ignore — React Native FormData
    form.append("modele", { uri: payload.modele.uri, name: payload.modele.name, type: payload.modele.type });
    form.append("brief", payload.brief);
    form.append("type_gabarit", payload.type_gabarit);
    if (payload.pays) form.append("pays", payload.pays);
    const { data } = await http.post("/bureau/infographie/generer-depuis-modele", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180_000,
    });
    return data;
  },

  genererCustom: async (payload: {
    width_mm: number; height_mm: number; bleed_mm?: number; brief: string; pays?: string;
  }): Promise<ResultatInfographieReponse> => {
    const { data } = await http.post("/bureau/infographie/generer-custom", payload, { timeout: 120_000 });
    return data;
  },

  urlTelechargement: (fichier_id: string) =>
    `${BASE_URL}/bureau/infographie/fichier/${encodeURIComponent(fichier_id)}`,
};

// ── Enquêtes & Études qualitatives/quantitatives ─────────────────────────────

export const enquetesApi = {
  lister: async () => {
    const { data } = await http.get("/enquetes/");
    return data as { etudes: Array<Record<string, any>> };
  },

  creer: async (payload: {
    titre: string;
    contexte: string;
    questions_recherche: string[];
    methodologie: string;
    population_cible: string;
    terrain: string;
    mode: string;
  }) => {
    const { data } = await http.post("/enquetes/", payload);
    return data as { etude_id: string; titre: string; statut: string };
  },

  uploaderAudio: async (
    etudeId: string,
    audioUri: string,
    locuteur = "Répondant",
    langue = "fr",
  ) => {
    const form = new FormData();
    const ext = audioUri.split(".").pop()?.toLowerCase() || "m4a";
    const mimeMap: Record<string, string> = {
      m4a: "audio/mp4", mp4: "audio/mp4", mp3: "audio/mpeg",
      wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg",
    };
    const mime = mimeMap[ext] ?? "audio/mp4";
    // @ts-ignore
    form.append("audio", { uri: audioUri, name: `terrain_${Date.now()}.${ext}`, type: mime });
    form.append("locuteur", locuteur);
    form.append("langue", langue);
    const { data } = await http.post(`/enquetes/${etudeId}/audio`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
    return data as { locuteur: string; extrait: string; longueur_totale: number; n_transcriptions_total: number };
  },

  analyser: async (etudeId: string) => {
    const { data } = await http.post(`/enquetes/${etudeId}/analyser`);
    return data as { n_themes: number; graphiques: string[]; saturation: boolean };
  },

  genererRapport: async (etudeId: string, format = "docx") => {
    const { data } = await http.post(`/enquetes/${etudeId}/rapport`, null, {
      params: { format_rapport: format },
      timeout: 240_000,
    });
    return data as {
      rapport_texte: string;
      themes: Array<{ code: string; libelle: string; frequence: number; citations: string[]; sentiment: string }>;
      n_themes: number;
      n_entretiens: number;
      fichier_id?: string;
      sauvegarde_mes_documents?: boolean;
    };
  },

  getRapport: async (etudeId: string) => {
    const { data } = await http.get(`/enquetes/${etudeId}/rapport`);
    return data;
  },

  uploadProtocole: async (
    etudeId: string,
    file: { uri: string; name: string; type: string },
    params: { titre: string; objectif?: string; population?: string; n_questions?: number },
  ) => {
    const form = new FormData();
    // @ts-ignore — React Native FormData
    form.append("fichier", { uri: file.uri, name: file.name, type: file.type });
    form.append("etude_id", etudeId);
    form.append("titre", params.titre);
    if (params.objectif) form.append("objectif", params.objectif);
    if (params.population) form.append("population", params.population);
    form.append("n_questions", String(params.n_questions ?? 20));
    const { data } = await http.post("/enquetes/upload-protocole", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 240_000,
    });
    return data as {
      formulaire_id: string;
      titre: string;
      n_questions: number;
      xlsform_fichier_id?: string;
      sauvegarde_mes_documents?: boolean;
    };
  },

  genererFormulaireIa: async (payload: {
    titre: string; description: string; objectif?: string;
    population?: string; n_questions?: number; creer_dans_etude?: string;
  }) => {
    const { data } = await http.post("/enquetes/generer-formulaire-ia", payload, { timeout: 180_000 });
    return data;
  },

  analyserQuantitatif: async (etudeId: string) => {
    const { data } = await http.post(`/enquetes/${etudeId}/analyser-quantitatif`);
    return data;
  },

  analyserIntelligent: async (etudeId: string) => {
    const { data } = await http.post(`/enquetes/${etudeId}/analyser-intelligent`);
    return data;
  },

  analyserCommentaires: async (etudeId: string) => {
    const { data } = await http.post(`/enquetes/${etudeId}/analyser-commentaires`);
    return data;
  },
};

export default http;
