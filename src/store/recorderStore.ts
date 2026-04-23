import { create } from "zustand";

/**
 * Enregistrement audio persistant (mobile).
 * L'objet Recording expo-av et le timer vivent au niveau module pour survivre
 * au démontage React lors de la navigation entre écrans.
 */

let Audio: any = null;
try { Audio = require("expo-av").Audio; } catch (_) {}

let _recording: any = null;
let _timer: ReturnType<typeof setInterval> | null = null;
let _startDuration = 0;

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri: string | null;
  supported: boolean;

  start: () => Promise<void>;
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
  supported: !!Audio,

  start: async () => {
    if (!Audio) throw new Error("expo-av non installé");
    if (get().isRecording) return;

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
    _startDuration = 0;
    set({ isRecording: true, isPaused: false, duration: 0, uri: null });
    _stopTick();
    _startTick();
  },

  pauseResume: async () => {
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
    } catch (_) { /* ignore */ }
  },

  stop: async () => {
    _stopTick();
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
    if (_recording) {
      try { _recording.stopAndUnloadAsync(); } catch (_) {}
      _recording = null;
    }
    _startDuration = 0;
    set({ isRecording: false, isPaused: false, duration: 0, uri: null });
  },
}));
