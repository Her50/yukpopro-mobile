import { create } from "zustand";
import { Alert } from "react-native";

/**
 * Persistance des générations Yukpo Studio (mobile).
 * Les requêtes tournent au niveau module — l'utilisateur peut quitter l'écran
 * pendant une génération longue, le résultat reste dispo au retour.
 */

type JobKey = "rapport" | "slides" | "fichiers" | "conversion" | "infographie";

interface GenerateurState {
  loading: Record<JobKey, boolean>;
  resultats: Record<JobKey, any>;

  run: <T>(
    key: JobKey,
    fn: () => Promise<T>,
    opts?: { successMsg?: string; errorMsg?: string; onError?: (err: any) => void },
  ) => Promise<T | null>;
  setResultat: (key: JobKey, value: any) => void;
  clear: (key: JobKey) => void;
}

const initialLoading: Record<JobKey, boolean> = {
  rapport: false, slides: false, fichiers: false, conversion: false, infographie: false,
};
const initialResultats: Record<JobKey, any> = {
  rapport: null, slides: null, fichiers: null, conversion: null, infographie: null,
};

export const useGenerateurStore = create<GenerateurState>((set, get) => ({
  loading: { ...initialLoading },
  resultats: { ...initialResultats },

  run: async (key, fn, opts) => {
    if (get().loading[key]) return null;
    set((st) => ({
      loading: { ...st.loading, [key]: true },
      resultats: { ...st.resultats, [key]: null },
    }));
    try {
      const res = await fn();
      set((st) => ({
        loading: { ...st.loading, [key]: false },
        resultats: { ...st.resultats, [key]: res },
      }));
      if (opts?.successMsg) Alert.alert("Succès", opts.successMsg);
      return res;
    } catch (err: any) {
      set((st) => ({ loading: { ...st.loading, [key]: false } }));
      if (opts?.onError) opts.onError(err);
      else Alert.alert("Erreur", opts?.errorMsg || err?.response?.data?.detail || err?.message || "Échec de la génération");
      return null;
    }
  },

  setResultat: (key, value) =>
    set((st) => ({ resultats: { ...st.resultats, [key]: value } })),

  clear: (key) =>
    set((st) => ({
      loading: { ...st.loading, [key]: false },
      resultats: { ...st.resultats, [key]: null },
    })),
}));
