import { create } from "zustand";

// ── Couleurs Yukpo ────────────────────────────────────────────────────────────
export const COLORS = {
  primary:      "#7B3FE4",
  primaryDark:  "#5B1FBE",
  accent:       "#06B6D4",
  gold:         "#F59E0B",
  // Dark Pro — warm gray (Linear / GitHub Dark)
  bg:           "#111827",   // fond principal gray-900
  bgSurface:    "#0D1117",   // header/sidebar encore plus sombre
  bgCard:       "#1F2937",   // cartes gray-800
  bgCardHover:  "#374151",   // hover gray-700
  bgInput:      "#1F2937",   // champs de saisie
  bgCardBorder: "#374151",   // bordures gray-700
  borderLight:  "#4B5563",   // bordures visibles gray-600
  textPrimary:  "#F9FAFB",   // presque blanc — excellent contraste
  textSecondary:"#D1D5DB",   // gray-300
  textMuted:    "#9CA3AF",   // gray-400
  success:      "#22C55E",
  error:        "#EF4444",
  warning:      "#F59E0B",
};

// ── Auth ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: Record<string, unknown> | null;
  isAuthenticated: boolean;
  setAuth: (user: Record<string, unknown>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// ── Profil ────────────────────────────────────────────────────────────────────

interface ProfilState {
  profil: Record<string, unknown> | null;
  setProfil: (p: Record<string, unknown>) => void;
}

export const useProfilStore = create<ProfilState>()((set) => ({
  profil: null,
  setProfil: (p) => set({ profil: p }),
}));

// ── Copilote ──────────────────────────────────────────────────────────────────

export interface MobileMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  loading?: boolean;
  agent_utilise?: string | null;
}

interface CopiloteState {
  messages: MobileMessage[];
  isLoading: boolean;
  sessionId: string | null;
  addMessage: (m: MobileMessage) => void;
  updateLastMessage: (content: string, agent?: string | null) => void;
  setLoading: (v: boolean) => void;
  clearSession: () => void;
  setSessionId: (id: string) => void;
}

export const useCopiloteStore = create<CopiloteState>()((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateLastMessage: (content, agent) =>
    set((s) => {
      const msgs = [...s.messages];
      const idx = msgs.findLastIndex((m) => m.role === "assistant" && m.loading);
      if (idx >= 0) msgs[idx] = { ...msgs[idx], content, loading: false, agent_utilise: agent };
      return { messages: msgs };
    }),
  setLoading: (v) => set({ isLoading: v }),
  clearSession: () => set({ messages: [], sessionId: null }),
  setSessionId: (id) => set({ sessionId: id }),
}));
