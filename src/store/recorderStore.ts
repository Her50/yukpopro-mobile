import { create } from "zustand";
import { pcmRecorder, pcmRecorderAvailable } from "../services/pcm_recorder";

/**
 * Enregistrement audio mobile persistant.
 * - Mode par défaut (`expo-av`) : WAV/M4A haute qualité, compatible Expo Go.
 * - Mode PCM (`pcmMode: true`) : 16 kHz mono via react-native-audio-record,
 *   micro partagé avec translate_live. Nécessite un dev client.
 */

let Audio: any = null;
try { Audio = require("expo-av").Audio; } catch (_) {}

let _recording: any = null;
let _timer: ReturnType<typeof setInterval> | null = null;
let _pcmMode = false;
let _pcmWavPath: string | null = null;

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri: string | null;
  supported: boolean;

  start: (opts?: { pcmMode?: boolean }) => Promise<void>;
  pauseResume: () => Promise<void>;
  stop: () => Promise<string | null>;
  reset: () => void;
}

const _startTick = () => {
  _timer = setInterval(() => {
    useRecorderStore.setState((s) => ({ duration: s.duration + 1 }));
  }, 1000);
};

const _stopTick = () => {
  if (_timer) { clearInterval(_timer); _timer = null; }
};

export const useRecorderStore = create<RecorderState>((set, get) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  uri: null,
  supported: !!Audio || pcmRecorderAvailable,

  start: async (opts) => {
    if (get().isRecording) return;
    _pcmMode = !!opts?.pcmMode;

    if (_pcmMode) {
      if (!pcmRecorderAvailable) throw new Error("Dev client requis (react-native-audio-record).");
      await pcmRecorder.start({ wavFile: "yukpo_reunion.wav" });
      _pcmWavPath = null;
      set({ isRecording: true, isPaused: false, duration: 0, uri: null });
      _stopTick();
      _startTick();
      return;
    }

    if (!Audio) throw new Error("expo-av non installé");
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") throw new Error("Permission microphone refusée");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: false,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
    });

    const recordingOptions = {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        sampleRate: 48000, numberOfChannels: 2, bitRate: 128000,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        sampleRate: 48000, numberOfChannels: 2, bitRate: 128000,
        linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false,
      },
    };

    const { recording } = await Audio.Recording.createAsync(recordingOptions);
    _recording = recording;
    set({ isRecording: true, isPaused: false, duration: 0, uri: null });
    _stopTick();
    _startTick();
  },

  pauseResume: async () => {
    if (_pcmMode) return; // pause non supportée en mode PCM — arrêt/reprise seulement
    if (!_recording) return;
    try {
      const status = await _recording.getStatusAsync();
      if (status.isRecording) {
        await _recording.pauseAsync();
        _stopTick();
        set({ isPaused: true });
      } else {
        await _recording.startAsync();
        _startTick();
        set({ isPaused: false });
      }
    } catch (_) {}
  },

  stop: async () => {
    _stopTick();
    if (_pcmMode) {
      const path = await pcmRecorder.stop();
      _pcmWavPath = path;
      _pcmMode = false;
      set({ isRecording: false, isPaused: false, uri: path });
      return path;
    }
    if (!_recording) {
      set({ isRecording: false, isPaused: false });
      return null;
    }
    try {
      await _recording.stopAndUnloadAsync();
      const uri = _recording.getURI();
      _recording = null;
      set({ isRecording: false, isPaused: false, uri });
      return uri || null;
    } catch (_) {
      _recording = null;
      set({ isRecording: false, isPaused: false });
      return null;
    }
  },

  reset: () => {
    _stopTick();
    if (_pcmMode) { try { pcmRecorder.stop(); } catch {} _pcmMode = false; }
    if (_recording) {
      try { _recording.stopAndUnloadAsync(); } catch (_) {}
      _recording = null;
    }
    _pcmWavPath = null;
    set({ isRecording: false, isPaused: false, duration: 0, uri: null });
  },
}));
