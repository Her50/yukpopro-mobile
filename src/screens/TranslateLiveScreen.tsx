/**
 * YukpoTranslate Live — écran mobile (Expo / React Native).
 *
 * Enregistrement de chunks audio (~4s), envoi à POST /translate/live/chunk,
 * affichage des sous-titres bilingues en temps quasi-réel (latence ~3-5s).
 *
 * Note : contrairement à la PWA, pas de streaming PCM raw (RN ne supporte pas
 * AudioWorklet). L'expérience est "quasi temps réel" via chunks successifs.
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors } from "@/store";
import { translateLiveApi } from "@/api/client";

// expo-av optionnel pour compat Web
let Audio: any = null;
try { Audio = require("expo-av").Audio; } catch (_) {}

type Ligne = {
  id: string;
  source: string;
  translated: string;
  sourceLang: string;
  ts: number;
};

type Langue = { code: string; label: string; flag: string; stt: boolean; trad: boolean };

const CHUNK_DURATION_MS = 4000; // 4 secondes par chunk — bon compromis latence/coût
const DEFAULT_LANGUES: Langue[] = [
  { code: "auto", label: "Détection auto",  flag: "🌐", stt: true,  trad: false },
  { code: "fr",   label: "Français",         flag: "🇫🇷", stt: true,  trad: true  },
  { code: "en",   label: "English",          flag: "🇬🇧", stt: true,  trad: true  },
  { code: "pt",   label: "Português",        flag: "🇵🇹", stt: true,  trad: true  },
  { code: "es",   label: "Español",          flag: "🇪🇸", stt: true,  trad: true  },
  { code: "ar",   label: "Arabe",            flag: "🇸🇦", stt: true,  trad: true  },
  { code: "sw",   label: "Swahili",          flag: "🇹🇿", stt: false, trad: true  },
  { code: "wo",   label: "Wolof",            flag: "🇸🇳", stt: false, trad: true  },
  { code: "yo",   label: "Yoruba",           flag: "🇳🇬", stt: false, trad: true  },
  { code: "ha",   label: "Hausa",            flag: "🇳🇬", stt: false, trad: true  },
];

export const TranslateLiveScreen = () => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [langues, setLangues]         = useState<Langue[]>(DEFAULT_LANGUES);
  const [source, setSource]           = useState("auto");
  const [target, setTarget]           = useState("fr");
  const [isStreaming, setIsStreaming] = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [lignes, setLignes]           = useState<Ligne[]>([]);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [showLangSrc, setShowLangSrc] = useState(false);
  const [showLangTgt, setShowLangTgt] = useState(false);
  const [tipsOpen, setTipsOpen]       = useState(false);

  const recordingRef = useRef<any>(null);
  const streamingRef = useRef<boolean>(false);
  const scrollRef    = useRef<ScrollView>(null);

  // ── Chargement config ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [, langs] = await Promise.all([
          translateLiveApi.status(),
          translateLiveApi.langues(),
        ]);
        if (langs.langues?.length) setLangues(langs.langues);
      } catch {}
    })();
  }, []);

  // Cleanup au démontage
  useEffect(() => {
    return () => { stopStreaming(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lignes]);

  // ── Démarrage ───────────────────────────────────────────────────────────
  const startStreaming = async () => {
    if (!Audio) {
      Alert.alert("expo-av requis", "Installez expo-av pour utiliser cette fonctionnalité.");
      return;
    }
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisez l'accès au microphone dans les réglages.");
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: false,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
    });
    setLignes([]);
    setMinutesUsed(0);
    setCreditsUsed(0);
    streamingRef.current = true;
    setIsStreaming(true);
    boucleChunks();
  };

  const stopStreaming = async () => {
    streamingRef.current = false;
    setIsStreaming(false);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
  };

  // ── Boucle d'enregistrement par chunks ──────────────────────────────────
  const boucleChunks = async () => {
    while (streamingRef.current) {
      try {
        const options = {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
          },
          ios: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
          },
        };
        const { recording } = await Audio.Recording.createAsync(options);
        recordingRef.current = recording;

        // Enregistrer pendant CHUNK_DURATION_MS
        await new Promise((r) => setTimeout(r, CHUNK_DURATION_MS));

        if (!streamingRef.current) {
          try { await recording.stopAndUnloadAsync(); } catch {}
          break;
        }

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;
        if (uri) {
          // Envoi en parallèle (ne pas bloquer le prochain chunk)
          envoyerChunk(uri);
        }
      } catch (err: any) {
        console.warn("[TranslateLive] chunk error:", err?.message);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  const envoyerChunk = async (uri: string) => {
    setProcessing(true);
    try {
      const result = await translateLiveApi.traduireChunk(uri, source, target);
      if (!result.transcript?.trim()) return;
      const ligne: Ligne = {
        id: `${Date.now()}-${Math.random()}`,
        source: result.transcript,
        translated: result.translation || result.transcript,
        sourceLang: result.source_lang,
        ts: Date.now(),
      };
      setLignes((prev) => [...prev, ligne]);
      setMinutesUsed((m) => m + result.duration_s / 60);
      setCreditsUsed((c) => c + (result.credits_debited || 0));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 402) {
        Alert.alert("Crédits épuisés", "Rechargez pour continuer la traduction.");
        stopStreaming();
      } else {
        console.warn("[TranslateLive] envoi chunk échoué:", err?.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const langueSource = (code: string) => langues.find((l) => l.code === code);
  const langueTarget = (code: string) => langues.find((l) => l.code === code);
  const languesCibles = langues.filter((l) => l.code !== "auto" && l.trad);

  // ── Rendu ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🎙️ Traduction Live</Text>
          <Text style={styles.subtitle}>Sous-titres temps réel — chunks 4s</Text>
        </View>
        <View style={styles.badges}>
          <Text style={styles.badge}>⏱ {minutesUsed.toFixed(1)} min</Text>
          <Text style={[styles.badge, { color: C.gold }]}>
            🪙 {Math.round(creditsUsed)}
          </Text>
        </View>
      </View>

      <View style={styles.configCard}>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Langue source</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => !isStreaming && setShowLangSrc(true)}
              disabled={isStreaming}
            >
              <Text style={styles.selectText}>
                {langueSource(source)?.flag} {langueSource(source)?.label}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ width: 10 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>Langue cible</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setShowLangTgt(true)}
            >
              <Text style={styles.selectText}>
                {langueTarget(target)?.flag} {langueTarget(target)?.label}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Conseils micro — collapsible */}
        <TouchableOpacity style={styles.tipsHeader} onPress={() => setTipsOpen((o) => !o)} activeOpacity={0.7}>
          <Text style={styles.tipsTitle}>ℹ️ Conseil selon le contexte</Text>
          <Text style={styles.tipsChevron}>{tipsOpen ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {tipsOpen && (
          <View style={styles.tipsBody}>
            <Text style={styles.tipItem}><Text style={styles.tipBold}>Réunion Zoom/Teams</Text> — préfère la capture onglet/écran (si dispo) pour capter l'audio directement.</Text>
            <Text style={styles.tipItem}><Text style={styles.tipBold}>Petite salle (1–4 pers.)</Text> — le micro du téléphone posé sur la table suffit.</Text>
            <Text style={styles.tipItem}><Text style={styles.tipBold}>Grande salle</Text> — utilise un micro USB omnidirectionnel au centre (Jabra Speak 510, Anker PowerConf S3).</Text>
            <Text style={styles.tipItem}><Text style={styles.tipBold}>Plusieurs utilisateurs dans la salle</Text> — un seul micro suffit. Chacun lit les sous-titres sur son écran. Avec la voix 🔊, écouteurs obligatoires.</Text>
            <Text style={[styles.tipItem, { color: "#fbbf24" }]}>⚡ Voix activée = écouteurs obligatoires.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnMain, isStreaming ? styles.btnStop : styles.btnStart]}
          onPress={isStreaming ? stopStreaming : startStreaming}
          activeOpacity={0.8}
        >
          {isStreaming ? (
            <>
              <Ionicons name="stop" size={22} color="#fff" />
              <Text style={styles.btnText}>Arrêter la traduction</Text>
            </>
          ) : (
            <>
              <Ionicons name="mic" size={22} color="#fff" />
              <Text style={styles.btnText}>Démarrer la traduction</Text>
            </>
          )}
        </TouchableOpacity>

        {isStreaming && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              🔴 En écoute{processing ? " · traitement…" : ""}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.transcriptCard}>
        <Text style={styles.cardHeader}>
          💬 Transcription bilingue
          {lignes.length > 0 && `  (${lignes.length})`}
        </Text>
        <ScrollView ref={scrollRef} style={styles.transcriptScroll}>
          {lignes.length === 0 && (
            <Text style={styles.empty}>
              {isStreaming
                ? "En attente de parole…"
                : "Démarrez pour commencer la transcription."}
            </Text>
          )}
          {lignes.map((l) => (
            <View key={l.id} style={styles.ligneBox}>
              <View style={styles.ligneRow}>
                <Text style={styles.ligneLangSrc}>{l.sourceLang.toUpperCase()}</Text>
                <Text style={styles.ligneText}>{l.source}</Text>
              </View>
              <View style={[styles.ligneRow, { marginTop: 6 }]}>
                <Text style={styles.ligneLangDst}>{target.toUpperCase()}</Text>
                <Text style={styles.ligneTrad}>{l.translated}</Text>
              </View>
            </View>
          ))}
          {processing && isStreaming && (
            <View style={{ alignItems: "center", padding: 10 }}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modales de sélection langue */}
      <Modal visible={showLangSrc} animationType="slide" transparent>
        <LangPicker
          langues={langues}
          onSelect={(c) => { setSource(c); setShowLangSrc(false); }}
          onClose={() => setShowLangSrc(false)}
          titre="Langue source"
        />
      </Modal>
      <Modal visible={showLangTgt} animationType="slide" transparent>
        <LangPicker
          langues={languesCibles}
          onSelect={(c) => { setTarget(c); setShowLangTgt(false); }}
          onClose={() => setShowLangTgt(false)}
          titre="Langue cible"
        />
      </Modal>
    </View>
  );
};

// ── Sous-composant : sélecteur de langue ─────────────────────────────────────
const LangPicker = ({
  langues, onSelect, onClose, titre,
}: { langues: Langue[]; onSelect: (code: string) => void; onClose: () => void; titre: string }) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{titre}</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={C.textMuted} />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {langues.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={styles.langRow}
            onPress={() => onSelect(l.code)}
          >
            <Text style={styles.langFlag}>{l.flag}</Text>
            <Text style={styles.langLabel}>{l.label}</Text>
            {!l.stt && l.code !== "auto" && (
              <Text style={styles.langBadge}>STT limité</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (C: Colors) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === "ios" ? 50 : 24 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 16 },
  title:       { fontSize: 20, fontWeight: "700", color: C.textPrimary },
  subtitle:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
  badges:      { alignItems: "flex-end", gap: 4 },
  badge:       { fontSize: 12, color: C.textSecondary, fontWeight: "600" },
  configCard:  { margin: 16, marginTop: 0, padding: 16, backgroundColor: C.bgCard, borderRadius: 12, borderColor: C.bgCardBorder, borderWidth: 1 },
  row:         { flexDirection: "row", marginBottom: 14 },
  flex1:       { flex: 1 },
  label:       { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  select:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, backgroundColor: C.bgInput, borderRadius: 8, borderColor: C.bgCardBorder, borderWidth: 1 },
  selectText:  { color: C.textPrimary, fontSize: 13, flex: 1 },
  btnMain:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  btnStart:    { backgroundColor: C.primary },
  btnStop:     { backgroundColor: C.error },
  btnText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "center" },
  liveDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: C.error },
  liveText:    { color: C.textSecondary, fontSize: 12 },
  tipsHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, marginBottom: 2, backgroundColor: "rgba(0,84,166,0.10)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,176,240,0.20)" },
  tipsTitle:   { fontSize: 12, color: "#7dd3fc", fontWeight: "600" },
  tipsChevron: { fontSize: 10, color: "#6b7280" },
  tipsBody:    { backgroundColor: "rgba(0,84,166,0.06)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,176,240,0.12)", padding: 10, marginBottom: 8, gap: 6 },
  tipItem:     { fontSize: 11, color: "#94a3b8", lineHeight: 16 },
  tipBold:     { color: "#cbd5e1", fontWeight: "600" },
  transcriptCard: { flex: 1, margin: 16, marginTop: 0, backgroundColor: C.bgCard, borderRadius: 12, borderColor: C.bgCardBorder, borderWidth: 1, overflow: "hidden" },
  cardHeader:  { padding: 12, borderBottomColor: C.bgCardBorder, borderBottomWidth: 1, color: C.textSecondary, fontSize: 13, fontWeight: "600" },
  transcriptScroll: { flex: 1, padding: 12 },
  empty:       { color: C.textMuted, textAlign: "center", padding: 30, fontSize: 13 },
  ligneBox:    { padding: 12, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 8, borderColor: "rgba(255,255,255,0.05)", borderWidth: 1 },
  ligneRow:    { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  ligneLangSrc:{ fontSize: 9, fontWeight: "700", color: C.textMuted, backgroundColor: "rgba(107,114,128,0.3)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  ligneLangDst:{ fontSize: 9, fontWeight: "700", color: "#C4B5FD", backgroundColor: "rgba(139,92,246,0.25)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  ligneText:   { flex: 1, color: C.textSecondary, fontSize: 14, lineHeight: 20 },
  ligneTrad:   { flex: 1, color: "#E9D5FF", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard:   { backgroundColor: C.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%", paddingBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomColor: C.bgCardBorder, borderBottomWidth: 1 },
  modalTitle:  { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  langRow:     { flexDirection: "row", alignItems: "center", padding: 14, borderBottomColor: C.bgCardBorder, borderBottomWidth: 1, gap: 12 },
  langFlag:    { fontSize: 22 },
  langLabel:   { flex: 1, color: C.textPrimary, fontSize: 14 },
  langBadge:   { fontSize: 10, color: "#FBBF24", backgroundColor: "rgba(251,191,36,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
