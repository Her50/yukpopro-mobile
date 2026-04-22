// ── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  nom: string;
  est_actif: boolean;
  date_creation: string;
}

// ── Profil Pro ────────────────────────────────────────────────────────────────

export interface ProfilPro {
  id: number;
  user_id: number;
  metier: string;
  pays: string;
  entreprise?: string;
  niveau_experience: "junior" | "senior" | "expert";
  secteur?: string;
  bio?: string;
  langue: string;
  xp_points: number;
  nombre_requetes: number;
  nombre_documents: number;
  date_creation: string;
}

export const METIERS = [
  "expert_comptable",
  "juriste",
  "fiscal",
  "auditeur",
  "conseiller_assurance",
  "banquier",
  "charge_projets_ong",
  "responsable_microfinance",
  "transitaire",
  "consultant",
  "entrepreneur",
  "autre",
] as const;

export type Metier = (typeof METIERS)[number];

export const PAYS_AFRIQUE = [
  "Cameroun",
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Burkina Faso",
  "Guinée",
  "Congo",
  "Gabon",
  "RDC",
  "Bénin",
  "Togo",
  "Niger",
  "Tchad",
  "Madagascar",
  "Mauritanie",
  "Autre",
] as const;

// ── API Responses ─────────────────────────────────────────────────────────────

export interface CopiloteResponse {
  reponse: string;
  session_id: string;
  agent_utilise?: string | null;
}

export interface AgentChatResponse {
  reponse: string;
  agent: string;
  outils_utilises?: string[];
}

export interface GenerateurResult {
  nom_fichier?: string;
  contenu?: string;
  format: string;
  taille_octets?: number;
}

export interface TraductionResponse {
  traduction: string;
  langue_source: string;
  langue_cible: string;
  terminologie_preservee?: string[];
}
