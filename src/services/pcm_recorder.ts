import { Buffer } from "buffer";

/**
 * PCM recorder mobile — singleton partagé par le recorder (WAV) et le translate_live (WS).
 *
 * `react-native-audio-record` ouvre une seule session audio ; on partage les
 * chunks entre plusieurs consommateurs via un système d'abonnés + refcount.
 *
 * Requiert un dev client (module natif — hors Expo Go).
 * `npx expo prebuild && eas build --profile development`
 */

let AudioRecord: any = null;
try {
  AudioRecord = require("react-native-audio-record").default || require("react-native-audio-record");
} catch (_) {
  AudioRecord = null;
}

export const pcmRecorderAvailable = !!AudioRecord;

type ChunkListener = (pcm16le: Uint8Array) => void;

const _listeners = new Set<ChunkListener>();
let _refCount = 0;
let _rawListener: ((data: string) => void) | null = null;
let _wavFileName = "yukpo_recording.wav";

const _attachRawListener = () => {
  if (_rawListener || !AudioRecord) return;
  _rawListener = (b64: string) => {
    try {
      const buf = Buffer.from(b64, "base64");
      const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      _listeners.forEach((fn) => { try { fn(u8); } catch {} });
    } catch {}
  };
  AudioRecord.on("data", _rawListener);
};

const _detachRawListener = () => {
  if (!AudioRecord) return;
  try { AudioRecord.removeAllListeners?.("data"); } catch {}
  _rawListener = null;
};

export const pcmRecorder = {
  available: pcmRecorderAvailable,

  /** Démarre l'enregistrement (idempotent via refcount). */
  async start(opts: { wavFile?: string } = {}): Promise<void> {
    if (!AudioRecord) throw new Error("react-native-audio-record indisponible — dev client requis.");
    if (_refCount === 0) {
      _wavFileName = opts.wavFile || _wavFileName;
      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_RECOGNITION (Android)
        wavFile: _wavFileName,
      });
      _attachRawListener();
      AudioRecord.start();
    }
    _refCount++;
  },

  /** Arrête quand le dernier consommateur relâche. Retourne le path du WAV si stoppé. */
  async stop(): Promise<string | null> {
    if (!AudioRecord || _refCount === 0) return null;
    _refCount = Math.max(0, _refCount - 1);
    if (_refCount > 0) return null;
    try {
      const filePath: string = await AudioRecord.stop();
      _detachRawListener();
      _listeners.clear();
      return filePath || null;
    } catch {
      _detachRawListener();
      _listeners.clear();
      return null;
    }
  },

  /** Abonnement aux chunks PCM16LE. Retourne une fonction de désabonnement. */
  subscribe(fn: ChunkListener): () => void {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },

  isActive(): boolean { return _refCount > 0; },
};
