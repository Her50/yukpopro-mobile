/**
 * Enquêtes & Études qualitatives — Yukpo Pro Mobile
 * Upload audio terrain → Whisper → codage thématique Claude → rapport académique
 * Inspiré du module Réunions mais adapté à la recherche de terrain.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, ActivityIndicator, Share, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { COLORS } from "@/store";
import { enquetesApi } from "@/api/client";

let Audio: any = null;
try { Audio = require("expo-av").Audio; } catch (_) {}

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "qualitatif" | "quantitatif" | "mixte";
type Methodologie = "exploratoire" | "phénoménologique" | "théorie ancrée" | "ethnographique";
type Statut = "brouillon" | "transcription" | "analyse" | "rapport_pret";

interface Theme {
  code: string;
  libelle: string;
  frequence: number;
  citations: string[];
  sentiment: string;
}

interface Etude {
  etude_id: string;
  titre: string;
  contexte: string;
  methodologie: Methodologie;
  terrain: string;
  mode: Mode;
  statut: Statut;
  n_transcriptions: number;
  n_themes: number;
  rapport_texte?: string;
  themes?: Theme[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const METHODOLOGIES: Methodologie[] = [
  "exploratoire", "phénoménologique", "théorie ancrée", "ethnographique",
];

const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: "qualitatif",   label: "Qualitatif",   desc: "Entretiens, focus groups, observations" },
  { value: "quantitatif",  label: "Quantitatif",  desc: "Questionnaires, sondages" },
  { value: "mixte",        label: "Mixte",         desc: "Combine les deux approches" },
];

const SENTIMENT_COLOR: Record<string, string> = {
  positif: "#22C55E", négatif: "#EF4444", neutre: "#3B82F6", mixte: "#F59E0B",
};

const fmtDur = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const today = () => new Date().toLocaleDateString("fr-FR");

// ── Composant principal ───────────────────────────────────────────────────────

export const EnquetesScreen = ({ navigation }: any) => {
  const [etudes,      setEtudes]      = useState<Etude[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [activeEtude, setActive]      = useState<Etude | null>(null);
  const [showRapport, setShowRapport] = useState(false);

  // Formulaire nouvelle étude
  const [titre,         setTitre]         = useState("");
  const [contexte,      setContexte]      = useState("");
  const [terrain,       setTerrain]       = useState("");
  const [population,    setPopulation]    = useState("");
  const [questions,     setQuestions]     = useState("");
  const [mode,          setMode]          = useState<Mode>("qualitatif");
  const [methodologie,  setMethodologie]  = useState<Methodologie>("exploratoire");
  const [formLoading,   setFormLoading]   = useState(false);

  // Enregistrement audio pour une étude active
  const recordingRef  = useRef<any>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [duration,     setDuration]     = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [locuteur,     setLocuteur]     = useState("Répondant");
  const [analysing,    setAnalysing]    = useState(false);

  const audioOk = !!Audio;

  useEffect(() => {
    chargerEtudes();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const chargerEtudes = async () => {
    setLoading(true);
    try {
      const res = await enquetesApi.lister();
      setEtudes(res.etudes as Etude[]);
    } catch (_) {} finally { setLoading(false); }
  };

  const resetForm = () => {
    setTitre(""); setContexte(""); setTerrain(""); setPopulation("");
    setQuestions(""); setMode("qualitatif"); setMethodologie("exploratoire");
  };

  // ── Créer étude ──────────────────────────────────────────────────────────────

  const handleCreer = async () => {
    if (!titre.trim()) { Alert.alert("Titre requis"); return; }
    if (!contexte.trim()) { Alert.alert("Contexte requis"); return; }
    setFormLoading(true);
    try {
      await enquetesApi.creer({
        titre: titre.trim(),
        contexte: contexte.trim(),
        questions_recherche: questions.split("\n").map(q => q.trim()).filter(Boolean),
        methodologie,
        population_cible: population.trim(),
        terrain: terrain.trim(),
        mode,
      });
      await chargerEtudes();
      resetForm();
      setShowForm(false);
      Alert.alert("Étude créée !", "Sélectionnez-la pour uploader vos enregistrements terrain.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Impossible de créer l'étude");
    } finally { setFormLoading(false); }
  };

  // ── Enregistrement audio ──────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!Audio) {
      Alert.alert("expo-av requis", "npm install expo-av");
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Autorisez l'accès au microphone.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, playsInSilentModeIOS: true,
        interruptionModeIOS: 1, shouldDuckAndroid: false, interruptionModeAndroid: 1,
      });
      const opts = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android, sampleRate: 44100, numberOfChannels: 1, bitRate: 96000 },
        ios:     { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,     sampleRate: 44100, numberOfChannels: 1, bitRate: 96000 },
      };
      const { recording } = await Audio.Recording.createAsync(opts);
      recordingRef.current = recording;
      setIsRecording(true); setIsPaused(false); setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    }
  };

  const handlePauseResume = async () => {
    if (!recordingRef.current) return;
    const st = await recordingRef.current.getStatusAsync();
    if (st.isRecording) {
      await recordingRef.current.pauseAsync();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      await recordingRef.current.startAsync();
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
  };

  const handleStopAndTranscrire = async () => {
    if (!recordingRef.current || !activeEtude) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false); setIsPaused(false);
      if (!uri) throw new Error("URI introuvable");

      const res = await enquetesApi.uploaderAudio(activeEtude.etude_id, uri, locuteur, "fr");
      const updated = { ...activeEtude, n_transcriptions: res.n_transcriptions_total, statut: "transcription" as Statut };
      setActive(updated);
      setEtudes(prev => prev.map(e => e.etude_id === activeEtude.etude_id ? updated : e));
      Alert.alert("Transcrit !", `${res.longueur_totale} caractères — ${res.n_transcriptions_total} entretien(s) au total.\n\nExtrait : ${res.extrait}`);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || err.message);
    } finally { setTranscribing(false); }
  };

  // ── Analyser ─────────────────────────────────────────────────────────────────

  const handleAnalyser = async (etude: Etude) => {
    if (etude.n_transcriptions === 0) {
      Alert.alert("Aucun audio", "Enregistrez au moins un entretien avant d'analyser.");
      return;
    }
    setAnalysing(true);
    try {
      const res = await enquetesApi.analyser(etude.etude_id);
      const updated = { ...etude, statut: "analyse" as Statut, n_themes: res.n_themes };
      setEtudes(prev => prev.map(e => e.etude_id === etude.etude_id ? updated : e));
      if (activeEtude?.etude_id === etude.etude_id) setActive(updated);
      Alert.alert(
        "Analyse terminée !",
        `${res.n_themes} thème(s) identifié(s).\nSaturation : ${res.saturation ? "✅ atteinte" : "⚠️ partielle"}`,
        [{ text: "Générer le rapport", onPress: () => handleGenererRapport(updated) }, { text: "Plus tard" }]
      );
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Analyse échouée");
    } finally { setAnalysing(false); }
  };

  // ── Rapport ───────────────────────────────────────────────────────────────────

  const handleGenererRapport = async (etude: Etude) => {
    setAnalysing(true);
    try {
      const res = await enquetesApi.genererRapport(etude.etude_id, "json");
      const updated: Etude = {
        ...etude,
        statut: "rapport_pret",
        rapport_texte: res.rapport_texte,
        themes: res.themes,
        n_themes: res.n_themes,
      };
      setEtudes(prev => prev.map(e => e.etude_id === etude.etude_id ? updated : e));
      setActive(updated);
      setShowRapport(true);
    } catch (err: any) {
      Alert.alert("Erreur rapport", err?.response?.data?.detail || "Génération échouée");
    } finally { setAnalysing(false); }
  };

  const handleShare = async (etude: Etude) => {
    if (!etude.rapport_texte) return;
    await Share.share({ message: etude.rapport_texte, title: etude.titre });
  };

  const statutLabel: Record<Statut, string> = {
    brouillon: "Brouillon",
    transcription: "Transcrit",
    analyse: "Analysé",
    rapport_pret: "Rapport prêt",
  };
  const statutColor: Record<Statut, string> = {
    brouillon: "#94A3B8", transcription: "#F59E0B", analyse: "#3B82F6", rapport_pret: "#22C55E",
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Enquêtes & Études</Text>
          <Text style={s.headerSub}>Analyse qualitative / quantitative IA</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />}

        {!loading && etudes.length === 0 && (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="analytics-outline" size={36} color="#3B82F6" />
            </View>
            <Text style={s.emptyTitle}>Aucune étude</Text>
            <Text style={s.emptyText}>
              Créez une étude, enregistrez vos entretiens terrain — Yukpo analyse et génère un rapport académique complet.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnText}>Nouvelle étude</Text>
            </TouchableOpacity>
          </View>
        )}

        {etudes.map(etude => (
          <View key={etude.etude_id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle} numberOfLines={1}>{etude.titre}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  <View style={[s.badge, { backgroundColor: SENTIMENT_COLOR[etude.mode === "qualitatif" ? "neutre" : etude.mode === "quantitatif" ? "positif" : "mixte"] + "22" }]}>
                    <Text style={[s.badgeText, { color: SENTIMENT_COLOR[etude.mode === "qualitatif" ? "neutre" : etude.mode === "quantitatif" ? "positif" : "mixte"] }]}>
                      {etude.mode}
                    </Text>
                  </View>
                  <Text style={s.cardSub}>{etude.n_transcriptions} audio{etude.n_transcriptions > 1 ? "s" : ""}</Text>
                  {etude.n_themes > 0 && <Text style={s.cardSub}>{etude.n_themes} thème{etude.n_themes > 1 ? "s" : ""}</Text>}
                </View>
              </View>
              <View style={[s.statut, { backgroundColor: statutColor[etude.statut] + "22" }]}>
                <Text style={[s.statutText, { color: statutColor[etude.statut] }]}>{statutLabel[etude.statut]}</Text>
              </View>
            </View>

            <Text style={s.cardCtx} numberOfLines={2}>{etude.contexte}</Text>

            <View style={s.cardActions}>
              <TouchableOpacity
                style={[s.btn, s.btnBlue, { flex: 1 }]}
                onPress={() => { setActive(etude); }}
              >
                <Ionicons name="mic-outline" size={14} color="#fff" />
                <Text style={s.btnTxt}>Enregistrer</Text>
              </TouchableOpacity>

              {etude.n_transcriptions > 0 && etude.statut !== "rapport_pret" && (
                <TouchableOpacity
                  style={[s.btn, s.btnViolet, { flex: 1 }, analysing && s.disabled]}
                  onPress={() => !analysing && handleAnalyser(etude)}
                  disabled={analysing}
                >
                  {analysing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles-outline" size={14} color="#fff" />}
                  <Text style={s.btnTxt}>Analyser</Text>
                </TouchableOpacity>
              )}

              {etude.statut === "rapport_pret" && (
                <TouchableOpacity
                  style={[s.btn, s.btnGreen, { flex: 1 }]}
                  onPress={() => { setActive(etude); setShowRapport(true); }}
                >
                  <Ionicons name="document-text-outline" size={14} color="#fff" />
                  <Text style={s.btnTxt}>Rapport</Text>
                </TouchableOpacity>
              )}

              {etude.statut === "analyse" && (
                <TouchableOpacity
                  style={[s.btn, s.btnAmber, { flex: 1 }, analysing && s.disabled]}
                  onPress={() => !analysing && handleGenererRapport(etude)}
                  disabled={analysing}
                >
                  <Ionicons name="reader-outline" size={14} color="#fff" />
                  <Text style={s.btnTxt}>Générer rapport</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Modal : Enregistrement audio terrain ─────────────────────────────── */}
      <Modal visible={!!activeEtude && !showRapport} animationType="slide" presentationStyle="pageSheet">
        {activeEtude && (
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle} numberOfLines={1}>{activeEtude.titre}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                  {activeEtude.n_transcriptions} entretien(s) enregistré(s)
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setActive(null); }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.flex} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">

              <Text style={s.label}>Nom / identifiant du répondant</Text>
              <TextInput
                style={s.input}
                value={locuteur}
                onChangeText={setLocuteur}
                placeholder="Répondant 1 / Informateur clé / Fokko"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={s.label}>Enregistrement audio du terrain</Text>
              <View style={s.recBox}>
                {isRecording && (
                  <View style={s.recTimer}>
                    <View style={[s.recDot, isPaused && { backgroundColor: "#94A3B8" }]} />
                    <Text style={s.recTime}>
                      {isPaused ? "Pause" : "Enregistrement"} — {fmtDur(duration)}
                    </Text>
                  </View>
                )}

                {transcribing ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={{ color: "#93C5FD", fontSize: 13 }}>Yukpo transcrit l'entretien…</Text>
                  </View>
                ) : !isRecording ? (
                  <TouchableOpacity
                    style={[s.recBtn, !audioOk && s.disabled]}
                    onPress={handleStart}
                    disabled={!audioOk}
                  >
                    <Ionicons name="mic" size={18} color="#fff" />
                    <Text style={s.recBtnTxt}>
                      {audioOk ? "Démarrer l'entretien" : "expo-av requis"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={[s.recBtn, s.recBtnAmber, { flex: 1 }]} onPress={handlePauseResume}>
                      <Ionicons name={isPaused ? "play" : "pause"} size={16} color="#fff" />
                      <Text style={s.recBtnTxt}>{isPaused ? "Reprendre" : "Pause"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.recBtn, s.recBtnStop, { flex: 2 }]} onPress={handleStopAndTranscrire}>
                      <Ionicons name="stop" size={16} color="#fff" />
                      <Text style={s.recBtnTxt}>Arrêter & transcrire</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={14} color="#93C5FD" />
                <Text style={s.infoText}>
                  Enregistrez chaque entretien séparément pour une meilleure analyse. Yukpo identifie les thèmes, citations et patterns de saturation.
                </Text>
              </View>

              {activeEtude.n_transcriptions > 0 && (
                <View style={{ gap: 8, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[s.btn, s.btnViolet, { justifyContent: "center" }, analysing && s.disabled]}
                    onPress={() => !analysing && handleAnalyser(activeEtude)}
                    disabled={analysing}
                  >
                    {analysing
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="sparkles-outline" size={16} color="#fff" />}
                    <Text style={s.btnTxt}>
                      {analysing ? "Analyse en cours…" : `Analyser (${activeEtude.n_transcriptions} entretien${activeEtude.n_transcriptions > 1 ? "s" : ""})`}
                    </Text>
                  </TouchableOpacity>

                  {activeEtude.statut === "analyse" && (
                    <TouchableOpacity
                      style={[s.btn, s.btnAmber, { justifyContent: "center" }, analysing && s.disabled]}
                      onPress={() => !analysing && handleGenererRapport(activeEtude)}
                      disabled={analysing}
                    >
                      <Ionicons name="reader-outline" size={16} color="#fff" />
                      <Text style={s.btnTxt}>Générer le rapport complet</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── Modal : Rapport ──────────────────────────────────────────────────── */}
      {showRapport && activeEtude && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle} numberOfLines={1}>{activeEtude.titre}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                  {activeEtude.n_entretiens ?? activeEtude.n_transcriptions} entretien(s) · {activeEtude.n_themes} thème(s)
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity onPress={() => handleShare(activeEtude)}>
                  <Ionicons name="share-outline" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRapport(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={s.flex} contentContainerStyle={s.rapportContent}>
              {/* Thèmes identifiés */}
              {activeEtude.themes && activeEtude.themes.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={s.sectionTitle}>Thèmes identifiés</Text>
                  {activeEtude.themes.map((t, i) => (
                    <View key={t.code ?? i} style={s.themeCard}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <View style={[s.sentBadge, { backgroundColor: (SENTIMENT_COLOR[t.sentiment] ?? "#94A3B8") + "33" }]}>
                          <Text style={[s.sentBadgeTxt, { color: SENTIMENT_COLOR[t.sentiment] ?? "#94A3B8" }]}>
                            {t.sentiment}
                          </Text>
                        </View>
                        <Text style={s.themeFreq}>{t.frequence}× cité</Text>
                      </View>
                      <Text style={s.themeLibelle}>{t.libelle}</Text>
                      {t.citations?.slice(0, 2).map((c, ci) => (
                        <Text key={ci} style={s.citation}>« {c} »</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Rapport texte */}
              <Text style={s.sectionTitle}>Rapport complet</Text>
              <Markdown style={mdStyles}>{activeEtude.rapport_texte || ""}</Markdown>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Modal : Nouvelle étude ────────────────────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nouvelle étude</Text>
            <TouchableOpacity onPress={() => { resetForm(); setShowForm(false); }}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.flex} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">

            <Text style={s.label}>Titre de l'étude *</Text>
            <TextInput style={s.input} value={titre} onChangeText={setTitre}
              placeholder="Perceptions de la couverture maladie…"
              placeholderTextColor={COLORS.textMuted} />

            <Text style={s.label}>Contexte & objectif *</Text>
            <TextInput style={[s.input, s.textarea]} value={contexte} onChangeText={setContexte}
              placeholder="Décrivez le contexte, l'objectif et la problématique de l'étude…"
              placeholderTextColor={COLORS.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

            <Text style={s.label}>Questions de recherche (une par ligne)</Text>
            <TextInput style={[s.input, s.textarea]} value={questions} onChangeText={setQuestions}
              placeholder={"Quels sont les obstacles à l'accès aux soins ?\nQuelle est la perception du système de santé ?"}
              placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

            <Text style={s.label}>Terrain / Zone géographique</Text>
            <TextInput style={s.input} value={terrain} onChangeText={setTerrain}
              placeholder="Douala-Bépanda, Marché central Yaoundé…"
              placeholderTextColor={COLORS.textMuted} />

            <Text style={s.label}>Population cible</Text>
            <TextInput style={s.input} value={population} onChangeText={setPopulation}
              placeholder="Commerçants, étudiants, ménages ruraux…"
              placeholderTextColor={COLORS.textMuted} />

            <Text style={s.label}>Mode</Text>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[s.modeCard, mode === m.value && s.modeCardActive]}
                onPress={() => setMode(m.value)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[s.modeLabel, mode === m.value && { color: "#3B82F6" }]}>{m.label}</Text>
                  {mode === m.value && <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />}
                </View>
                <Text style={s.modeDesc}>{m.desc}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>Méthodologie</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {METHODOLOGIES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.methChip, methodologie === m && s.methChipActive]}
                  onPress={() => setMethodologie(m)}
                >
                  <Text style={[s.methChipTxt, methodologie === m && { color: "#3B82F6" }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.footerBtn, s.footerCancel]} onPress={() => { resetForm(); setShowForm(false); }}>
              <Text style={s.footerCancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.footerBtn, s.footerSave, formLoading && s.disabled]}
              onPress={handleCreer}
              disabled={formLoading}
            >
              {formLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark" size={16} color="#fff" />}
              <Text style={s.footerSaveTxt}>Créer l'étude</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Styles markdown ───────────────────────────────────────────────────────────

const mdStyles: Record<string, object> = {
  body:         { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  heading1:     { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  heading2:     { color: COLORS.textPrimary, fontSize: 17, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  heading3:     { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  strong:       { fontWeight: "bold" },
  em:           { fontStyle: "italic" },
  blockquote:   { borderLeftWidth: 3, borderLeftColor: "#3B82F6", paddingLeft: 12, marginVertical: 6, opacity: 0.85 },
};

// ── StyleSheet ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  flex:         { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  headerTitle:  { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  headerSub:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  content:      { padding: 16, paddingBottom: 32, gap: 12 },

  empty:        { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 8 },
  emptyText:    { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  emptyBtn:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#3B82F6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  card:         { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  cardHeader:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  cardInfo:     { flex: 1 },
  cardTitle:    { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15 },
  cardSub:      { color: COLORS.textMuted, fontSize: 11 },
  cardCtx:      { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cardActions:  { flexDirection: "row", gap: 8 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 10, fontWeight: "600" },
  statut:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  statutText:   { fontSize: 10, fontWeight: "700" },

  btn:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  btnTxt:       { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnBlue:      { backgroundColor: "#3B82F6" },
  btnViolet:    { backgroundColor: "#7C3AED" },
  btnGreen:     { backgroundColor: "#16A34A" },
  btnAmber:     { backgroundColor: "#D97706" },
  disabled:     { opacity: 0.5 },

  modal:        { flex: 1, backgroundColor: COLORS.bg },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  modalTitle:   { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, flex: 1 },
  modalContent: { padding: 20, paddingBottom: 32, gap: 4 },
  label:        { color: COLORS.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input:        { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#374151", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  textarea:     { minHeight: 90 },
  modalFooter:  { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 32 : 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  footerBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  footerCancel: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#374151" },
  footerCancelTxt: { color: COLORS.textMuted, fontWeight: "600" },
  footerSave:   { backgroundColor: "#3B82F6" },
  footerSaveTxt:{ color: "#fff", fontWeight: "700" },

  recBox:       { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 8 },
  recTimer:     { flexDirection: "row", alignItems: "center", gap: 8 },
  recDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  recTime:      { color: "#F87171", fontSize: 13, fontWeight: "600" },
  recBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 10 },
  recBtnAmber:  { backgroundColor: "#D97706" },
  recBtnStop:   { backgroundColor: "#475569" },
  recBtnTxt:    { color: "#fff", fontWeight: "600", fontSize: 13 },

  infoBox:      { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(59,130,246,0.1)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.25)", marginTop: 8 },
  infoText:     { color: "#93C5FD", fontSize: 12, lineHeight: 18, flex: 1 },

  modeCard:     { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#374151", marginBottom: 6 },
  modeCardActive:{ borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,0.08)" },
  modeLabel:    { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 },
  modeDesc:     { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  methChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#374151", backgroundColor: "rgba(255,255,255,0.04)" },
  methChipActive:{ borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,0.1)" },
  methChipTxt:  { color: COLORS.textMuted, fontSize: 12 },

  rapportContent:{ padding: 20, paddingBottom: 40 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  themeCard:    { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10 },
  themeLibelle: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14, marginBottom: 6 },
  themeFreq:    { color: COLORS.textMuted, fontSize: 11 },
  citation:     { color: "#93C5FD", fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#3B82F6" },
  sentBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sentBadgeTxt: { fontSize: 10, fontWeight: "600" },
});
