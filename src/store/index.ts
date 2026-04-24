import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

// ── Palettes Yukpo ────────────────────────────────────────────────────────────
// Pattern light-first B2B (cf. yukpopro_web) avec toggle utilisateur.

export type Colors = {
  primary: string;
  primaryDark: string;
  accent: string;
  gold: string;
  bg: string;
  bgSurface: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  bgCardBorder: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  error: string;
  warning: string;
};

const PALETTE_DARK: Colors = {
  primary:      "#7B3FE4",
  primaryDark:  "#5B1FBE",
  accent:       "#06B6D4",
  gold:         "#F59E0B",
  bg:           "#111827",
  bgSurface:    "#0D1117",
  bgCard:       "#1F2937",
  bgCardHover:  "#374151",
  bgInput:      "#1F2937",
  bgCardBorder: "#374151",
  borderLight:  "#4B5563",
  textPrimary:  "#F9FAFB",
  textSecondary:"#D1D5DB",
  textMuted:    "#9CA3AF",
  success:      "#22C55E",
  error:        "#EF4444",
  warning:      "#F59E0B",
};

const PALETTE_LIGHT: Colors = {
  primary:      "#5B1FBE",
  primaryDark:  "#451599",
  accent:       "#0891B2",
  gold:         "#D97706",
  bg:           "#F1F5F9",
  bgSurface:    "#FFFFFF",
  bgCard:       "#FFFFFF",
  bgCardHover:  "#F1F5F9",
  bgInput:      "#FFFFFF",
  bgCardBorder: "#E2E8F0",
  borderLight:  "#CBD5E1",
  textPrimary:  "#0F172A",
  textSecondary:"#334155",
  textMuted:    "#64748B",
  success:      "#059669",
  error:        "#DC2626",
  warning:      "#D97706",
};

// Ref module-level qui pointe sur la palette active.
// Muté par le theme store pour que les imports `COLORS` existants
// lisent la palette courante au moment où StyleSheet.create s'exécute
// (attention : styles module-level ne se re-généreront pas au toggle
//  — remount via clé dans RootNavigator pour appliquer le changement).
export let COLORS: Colors = PALETTE_LIGHT;

const applyPalette = (theme: "light" | "dark") => {
  const next = theme === "dark" ? PALETTE_DARK : PALETTE_LIGHT;
  Object.assign(COLORS, next);
};

// ── Theme store ───────────────────────────────────────────────────────────────

const THEME_KEY = "yukpo.theme";

interface ThemeState {
  theme: "light" | "dark";
  hydrated: boolean;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: "light",
  hydrated: false,
  setTheme: (t) => {
    applyPalette(t);
    SecureStore.setItemAsync(THEME_KEY, t).catch(() => {});
    set({ theme: t });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
  hydrate: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      const t = saved === "dark" ? "dark" : "light";
      applyPalette(t);
      set({ theme: t, hydrated: true });
    } catch {
      applyPalette("light");
      set({ hydrated: true });
    }
  },
}));

// Init palette au chargement du module (avant premier render).
applyPalette("light");

// Hook reactif : retourne la palette active, re-render sur toggle.
export const useColors = (): Colors => {
  const theme = useThemeStore((s) => s.theme);
  return theme === "dark" ? PALETTE_DARK : PALETTE_LIGHT;
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

export interface ActiveDocument {
  id: number;
  titre: string;
  type_doc: string;
  contenu_genere?: string;
}

interface CopiloteState {
  messages: MobileMessage[];
  isLoading: boolean;
  sessionId: string | null;
  activeDocument: ActiveDocument | null;
  addMessage: (m: MobileMessage) => void;
  updateLastMessage: (content: string, agent?: string | null) => void;
  setLoading: (v: boolean) => void;
  clearSession: () => void;
  setSessionId: (id: string) => void;
  setActiveDocument: (doc: ActiveDocument | null) => void;
}

export const useCopiloteStore = create<CopiloteState>()((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  activeDocument: null,
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateLastMessage: (content, agent) =>
    set((s) => {
      const msgs = [...s.messages];
      const idx = msgs.findLastIndex((m) => m.role === "assistant" && m.loading);
      if (idx >= 0) msgs[idx] = { ...msgs[idx], content, loading: false, agent_utilise: agent };
      return { messages: msgs };
    }),
  setLoading: (v) => set({ isLoading: v }),
  clearSession: () => set({ messages: [], sessionId: null, activeDocument: null }),
  setSessionId: (id) => set({ sessionId: id }),
  setActiveDocument: (doc) => set({ activeDocument: doc }),
}));
