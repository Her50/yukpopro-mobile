import { create } from "zustand";
import { TranslateLiveClient, type TLEvent, type TranslateStatus } from "../services/translate_live";
import { pcmRecorderAvailable } from "../services/pcm_recorder";

/**
 * Store Zustand pour la session YukpoTranslate Live mobile.
 * Le client WebSocket vit au niveau module → survit au démontage d'écran.
 */

export interface Ligne {
  utteranceId: string;
  source: string;
  translated: string;
  sourceLang: string;
  isFinal: boolean;
}

interface TLState {
  status: TranslateStatus;
  statusMsg: string;
  active: boolean;
  available: boolean;

  lignes: Ligne[];
  currentInterim: string;
  minutesUsed: number;
  creditsUsed: number;

  target: string;

  start: (opts: {
    token: string;
    apiBaseUrl: string;
    source: string;
    target: string;
    onError?: (msg: string) => void;
  }) => Promise<void>;
  stop: () => Promise<void>;
  setTarget: (t: string) => void;
  reset: () => void;
}

let _client: TranslateLiveClient | null = null;

const handleEvent = (ev: TLEvent) => {
  const s = useTranslateLiveStore.setState;
  if (ev.type === "transcript") {
    if (ev.is_final) {
      s((st) => ({
        currentInterim: "",
        lignes: upsertLigne(st.lignes, {
          utteranceId: ev.utterance_id,
          source: ev.text,
          translated: "",
          sourceLang: ev.lang,
          isFinal: true,
        }),
      }));
    } else {
      s({ currentInterim: ev.text });
    }
  } else if (ev.type === "translation") {
    s((st) => ({
      lignes: upsertLigne(st.lignes, {
        utteranceId: ev.utterance_id,
        source: ev.source_text,
        translated: ev.translated_text,
        sourceLang: ev.source_lang,
        isFinal: true,
      }),
    }));
  } else if (ev.type === "usage") {
    s({ minutesUsed: ev.minutes, creditsUsed: ev.credits_debited_total });
  }
};

const upsertLigne = (lignes: Ligne[], l: Ligne): Ligne[] => {
  const idx = lignes.findIndex((x) => x.utteranceId === l.utteranceId);
  if (idx === -1) return [...lignes, l];
  const next = lignes.slice();
  next[idx] = { ...next[idx], ...l };
  return next;
};

export const useTranslateLiveStore = create<TLState>((set, get) => ({
  status: "idle",
  statusMsg: "",
  active: false,
  available: pcmRecorderAvailable,

  lignes: [],
  currentInterim: "",
  minutesUsed: 0,
  creditsUsed: 0,

  target: "fr",

  start: async ({ token, apiBaseUrl, source, target, onError }) => {
    if (_client) return;
    set({ target, lignes: [], currentInterim: "", minutesUsed: 0, creditsUsed: 0 });
    _client = new TranslateLiveClient({
      token, apiBaseUrl, source, target,
      onEvent: handleEvent,
      onStatus: (status, msg) => set({ status, statusMsg: msg || "", active: status === "streaming" || status === "ready" }),
      onError,
    });
    await _client.start();
  },

  stop: async () => {
    if (!_client) return;
    await _client.stop();
    _client = null;
    set({ active: false });
  },

  setTarget: (t) => {
    set({ target: t });
    _client?.setTargetLanguage(t);
  },

  reset: () => {
    if (_client) { try { _client.stop(); } catch {} _client = null; }
    set({
      status: "idle", statusMsg: "", active: false,
      lignes: [], currentInterim: "", minutesUsed: 0, creditsUsed: 0,
    });
  },
}));
