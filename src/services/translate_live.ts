/**
 * YukpoTranslate Live — client mobile (PCM 16 kHz mono via react-native-audio-record).
 *
 * Protocole identique au web : WebSocket /api/v1/translate/live/ws, réception
 * d'événements JSON (transcript/translation/usage/error), envoi de chunks PCM16LE.
 *
 * Le TTS audio binaire n'est pas joué côté mobile pour l'instant — seuls les
 * sous-titres sont exploités.
 */

import { pcmRecorder, pcmRecorderAvailable } from "./pcm_recorder";

export type TranslateStatus =
  | "idle" | "connecting" | "ready" | "streaming" | "stopping" | "closed" | "error";

export interface TLReady { type: "ready"; session_id: string; source: string; target: string; stt_available: boolean; credits_per_minute: number; }
export interface TLTranscript { type: "transcript"; text: string; lang: string; is_final: boolean; utterance_id: string; }
export interface TLTranslation { type: "translation"; source_text: string; translated_text: string; source_lang: string; target_lang: string; utterance_id: string; }
export interface TLUsage { type: "usage"; minutes: number; credits_debited_total: number; credits_debited_last: number; }
export interface TLError { type: "error"; code: string; message: string; }

export type TLEvent = TLReady | TLTranscript | TLTranslation | TLUsage | TLError | { type: "pong" } | { type: "stopped" } | { type: "config_ack"; source: string; target: string };

export interface TranslateLiveOptions {
  token: string;
  apiBaseUrl: string; // ex : "http://192.168.1.100:8000/api/v1"
  source: string;
  target: string;
  onEvent: (ev: TLEvent) => void;
  onStatus: (status: TranslateStatus, msg?: string) => void;
  onError?: (msg: string) => void;
}

export class TranslateLiveClient {
  private ws: WebSocket | null = null;
  private heartbeat: any = null;
  private status: TranslateStatus = "idle";
  private opts: TranslateLiveOptions;
  private stopping = false;
  private unsubscribe: (() => void) | null = null;

  constructor(opts: TranslateLiveOptions) { this.opts = opts; }

  get available(): boolean { return pcmRecorderAvailable; }

  async start(): Promise<void> {
    if (this.status !== "idle" && this.status !== "closed" && this.status !== "error") return;
    this.stopping = false;
    this.setStatus("connecting");

    if (!pcmRecorderAvailable) {
      this.setStatus("error", "Module audio natif manquant — build un dev client.");
      this.opts.onError?.("Dev client requis pour la traduction live mobile.");
      return;
    }

    try {
      await this.connectWS();
      await this.startCapture();
      this.setStatus("streaming");
    } catch (err: any) {
      this.setStatus("error", err?.message || "Erreur de démarrage");
      this.opts.onError?.(err?.message || "Erreur de démarrage");
      await this.cleanup();
    }
  }

  async stop(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    this.setStatus("stopping");
    await this.cleanup();
    this.setStatus("closed");
  }

  setTargetLanguage(target: string): void {
    this.opts.target = target;
    try { this.ws?.send(JSON.stringify({ type: "config", target })); } catch {}
  }

  private setStatus(s: TranslateStatus, msg?: string) {
    this.status = s;
    this.opts.onStatus(s, msg);
  }

  private async connectWS(): Promise<void> {
    const wsBase = this.opts.apiBaseUrl.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
    const url = `${wsBase}/api/v1/translate/live/ws`
      + `?token=${encodeURIComponent(this.opts.token)}`
      + `&source=${encodeURIComponent(this.opts.source)}`
      + `&target=${encodeURIComponent(this.opts.target)}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.heartbeat = setInterval(() => {
          try { ws.send("ping"); } catch {}
        }, 30_000);
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return; // on ignore les frames audio TTS binaires
        try {
          const msg = JSON.parse(ev.data) as TLEvent;
          if (msg.type === "ready") { this.setStatus("ready"); resolve(); }
          this.opts.onEvent(msg);
        } catch {}
      };
      ws.onerror = () => {
        if (this.status === "connecting") reject(new Error("Connexion WebSocket échouée"));
      };
      ws.onclose = (ev) => {
        if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null; }
        if (this.status === "connecting") reject(new Error(`Connexion fermée (${ev.code})`));
        else if (!this.stopping) this.setStatus("closed");
      };
    });
  }

  private async startCapture(): Promise<void> {
    await pcmRecorder.start();
    this.unsubscribe = pcmRecorder.subscribe((pcm) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.send(pcm); } catch {}
      }
    });
  }

  private async cleanup(): Promise<void> {
    if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }
    try { await pcmRecorder.stop(); } catch {}
    if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null; }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "stop" }));
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
