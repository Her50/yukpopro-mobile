/**
 * Réunions IA — Yukpo Pro Mobile
 * Enregistrement audio (expo-av) + transcription Whisper multilingue + rapport IA
 * Identifie automatiquement participants, décisions et plan d'action.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, ActivityIndicator, Share, Platform, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { COLORS } from "@/store";
import { reunionsApi, generateurApi } from "@/api/client";

// Audio — expo-av (optionnel : si non installé, mode notes uniquement)
let Audio: any = null;
try {
  Audio = require("expo-av").Audio;
} catch (_) {}

// ── Types ─────────────────────────────────────────────────────────────────────

type StatutReunion = "brouillon" | "analyse" | "termine";

interface Reunion {
  id: string;
  titre: string;
  date: string;
  participants: string;
  notes: string;
  rapport?: string;
  fichierRapport?: string; // nom du fichier DOCX généré côté serveur
  statut: StatutReunion;
  dureeEnreg?: number; // secondes
  langue?: string;
}

// ── Langues Whisper ───────────────────────────────────────────────────────────

const LANGUES = [
  { code: "auto", label: "Détection auto" },
  { code: "fr",   label: "Français" },
  { code: "en",   label: "English" },
  { code: "ar",   label: "Arabe" },
  { code: "sw",   label: "Kiswahili" },
  { code: "pt",   label: "Português" },
  { code: "es",   label: "Español" },
  { code: "wo",   label: "Wolof" },
  { code: "ha",   label: "Hausa" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const today      = () => new Date().toLocaleDateString("fr-FR");
const fmtDur     = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const makeId     = () => Date.now().toString() + Math.random().toString(36).slice(2);

function buildPrompt(r: Reunion): string {
  return [
    `Réunion : ${r.titre}`,
    `Date : ${r.date}`,
    r.participants ? `Participants : ${r.participants}` : "",
    r.langue && r.langue !== "auto" ? `Langue : ${r.langue}` : "",
    r.dureeEnreg ? `Durée d'enregistrement : ${fmtDur(r.dureeEnreg)}` : "",
    "",
    "Transcription / notes :",
    r.notes,
    "",
    "---",
    "Génère un rapport de réunion structuré en Markdown avec exactement :",
    "## 1. Résumé exécutif",
    "## 2. Participants présents (identifiés dans la transcription)",
    "## 3. Points importants discutés",
    "## 4. Décisions prises (liste numérotée)",
    "## 5. Plan d'action",
    "Tableau Markdown : | Action | Responsable | Échéance | Priorité |",
    "## 6. Recommandations & suivi",
    "",
    "Sois précis et professionnel. Identifie les personnes mentionnées. Propose une prochaine réunion si pertinent.",
  ].filter(Boolean).join("\n");
}

// ── Composant principal ───────────────────────────────────────────────────────

export const ReunionsScreen = ({ navigation }: any) => {
  const [reunions, setReunions]         = useState<Reunion[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [selectedRapport, setSelected] = useState<Reunion | null>(null);
  const [showLangs, setShowLangs]       = useState(false);

  // Formulaire
  const [titre,        setTitre]        = useState("");
  const [date,         setDate]         = useState(today());
  const [participants, setParticipants] = useState("");
  const [notes,        setNotes]        = useState("");
  const [langue,       setLangue]       = useState("auto");
  const [formLoading,  setFormLoading]  = useState(false);

  // Enregistrement
  const recordingRef = useRef<any>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [duration,     setDuration]     = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const audioSupported = !!Audio;

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const resetForm = () => {
    setTitre(""); setDate(today()); setParticipants("");
    setNotes(""); setLangue("auto"); setDuration(0);
    stopRecordingClean();
  };

  const stopRecordingClean = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  // ── Enregistrement ─────────────────────────────────────────────────────────

  const handleStartRecording = async () => {
    if (!Audio) {
      Alert.alert("Non disponible", "Installez expo-av pour l'enregistrement audio.\nnpm install expo-av");
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Autorisez l'accès au microphone dans les paramètres.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 1,          // mix avec autres apps (évite coupure)
        shouldDuckAndroid: false,        // ne pas réduire volume sur Android
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });

      // Options optimisées grande salle : bitrate élevé, 48kHz, gain auto
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          sampleRate: 48000,
          numberOfChannels: 2,           // stéréo pour capter toute la salle
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          sampleRate: 48000,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err: any) {
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement : " + err.message);
    }
  };

  const handlePauseResume = async () => {
    if (!recordingRef.current) return;
    try {
      const status = await recordingRef.current.getStatusAsync();
      if (status.isRecording) {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        await recordingRef.current.startAsync();
        setIsPaused(false);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
    } catch (err) {}
  };

  const handleStopAndTranscribe = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setTranscribing(true);
    const enregDuration = duration;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setIsPaused(false);

      if (!uri) throw new Error("URI audio introuvable");

      const res = await reunionsApi.transcrireDirect(uri, langue);
      const texte = res.transcription;
      const infos = res.traduit
        ? `\n[Transcrit depuis ${res.langue_detectee} → ${langue}]`
        : res.langue_detectee !== "unknown"
          ? `\n[Langue détectée : ${res.langue_detectee}]`
          : "";
      setNotes(prev => (prev.trim() ? prev + "\n\n--- Transcription ---\n" + texte + infos : texte + infos));
      setDuration(enregDuration);
      const msg = res.traduit
        ? `Transcrit depuis ${res.langue_detectee} et traduit en ${langue}.\n${texte.length} caractères.`
        : `${texte.length} caractères transcrits (${res.langue_detectee}).`;
      Alert.alert("Transcription réussie !", msg);
    } catch (err: any) {
      Alert.alert("Erreur transcription", err?.response?.data?.detail || err.message || "Vérifiez la clé API OpenAI.");
    } finally {
      setTranscribing(false);
    }
  };

  // ── Sauvegarde et analyse ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (isRecording) {
      Alert.alert("Enregistrement actif", "Arrêtez et transcrivez d'abord avant de sauvegarder.");
      return;
    }
    if (!titre.trim()) { Alert.alert("Titre requis", "Saisissez un titre."); return; }
    if (!notes.trim()) { Alert.alert("Notes requises", "Ajoutez des notes ou enregistrez la réunion."); return; }

    const r: Reunion = {
      id: makeId(), titre: titre.trim(), date, participants,
      notes: notes.trim(), statut: "brouillon",
      dureeEnreg: duration || undefined, langue,
    };
    setReunions(prev => [r, ...prev]);
    resetForm();
    setShowForm(false);
  };

  const handleAnalyse = async (id: string) => {
    const reunion = reunions.find(r => r.id === id);
    if (!reunion) return;
    setReunions(prev => prev.map(r => r.id === id ? { ...r, statut: "analyse" } : r));
    try {
      const langueRapport = reunion.langue && reunion.langue !== "auto" ? reunion.langue : "fr";

      const res = await reunionsApi.genererRapport({
        transcription: reunion.notes,
        titre: reunion.titre,
        participants: reunion.participants || undefined,
        langue: langueRapport,
        duree_secondes: reunion.dureeEnreg ? Math.round(reunion.dureeEnreg) : undefined,
      });
      const updated: Reunion = {
        ...reunion,
        statut: "termine",
        rapport: res.rapport,
        fichierRapport: res.fichier ?? undefined,
      };
      setReunions(prev => prev.map(r => r.id === id ? updated : r));
      const msgDoc = res.sauvegarde_mes_documents ? "\nSauvegardé dans Mes Documents ✓" : "";
      Alert.alert("Rapport prêt !", `Le rapport de réunion a été généré.${msgDoc}`, [
        { text: "Voir", onPress: () => setSelected(updated) },
        { text: "OK" },
      ]);
    } catch (err: any) {
      setReunions(prev => prev.map(r => r.id === id ? { ...r, statut: "brouillon" } : r));
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible d'analyser la réunion");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Supprimer", "Supprimer cette réunion ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => setReunions(prev => prev.filter(r => r.id !== id)) },
    ]);
  };

  const handleShare = async (rapport: string, titre: string) => {
    await Share.share({ message: rapport, title: titre });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const langueLabel = LANGUES.find(l => l.code === langue)?.label || "Détection auto";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Réunions Yukpo</Text>
          <Text style={styles.headerSub}>Enregistrement + transcription + rapport</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Vide */}
        {reunions.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={36} color="#3B82F6" />
            </View>
            <Text style={styles.emptyTitle}>Aucune réunion</Text>
            <Text style={styles.emptyText}>
              Enregistrez votre réunion — Yukpo transcrit automatiquement en 15+ langues et génère un rapport structuré.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Créer ma première réunion</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liste */}
        {reunions.map(r => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{r.titre}</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  <Text style={styles.cardDate}>{r.date}</Text>
                  {r.participants ? <Text style={styles.cardDate}>{r.participants.split(",")[0].trim()}</Text> : null}
                  {r.dureeEnreg ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="mic-outline" size={11} color={COLORS.textMuted} />
                      <Text style={styles.cardDate}>{fmtDur(r.dureeEnreg)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardStatus}>
                {r.statut === "termine"   && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
                {r.statut === "analyse"   && <ActivityIndicator size="small" color="#F59E0B" />}
                {r.statut === "brouillon" && <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />}
              </View>
            </View>

            <Text style={styles.cardNotes} numberOfLines={2}>{r.notes}</Text>

            <View style={styles.cardActions}>
              {r.statut === "termine" ? (
                <>
                  <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => setSelected(r)}>
                    <Ionicons name="document-text-outline" size={14} color="#fff" />
                    <Text style={styles.btnText}>Voir le rapport</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnGray]} onPress={() => handleShare(r.rapport || "", r.titre)}>
                    <Ionicons name="share-outline" size={14} color="#fff" />
                    <Text style={styles.btnText}>Partager</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.btnBlue, r.statut === "analyse" && styles.btnDisabled]}
                  onPress={() => r.statut !== "analyse" && handleAnalyse(r.id)}
                  disabled={r.statut === "analyse"}
                >
                  <Ionicons name="sparkles-outline" size={14} color="#fff" />
                  <Text style={styles.btnText}>
                    {r.statut === "analyse" ? "Analyse en cours…" : "Analyser avec Yukpo Pro"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={() => handleDelete(r.id)}>
                <Ionicons name="trash-outline" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Modal Formulaire ────────────────────────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle réunion</Text>
            <TouchableOpacity onPress={() => { resetForm(); setShowForm(false); }}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            {/* Titre */}
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              value={titre}
              onChangeText={setTitre}
              placeholder="Réunion mensuelle équipe finance"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Date */}
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Participants */}
            <Text style={styles.label}>Participants (séparés par virgule)</Text>
            <TextInput
              style={styles.input}
              value={participants}
              onChangeText={setParticipants}
              placeholder="Jean Dupont, Marie Kouassi, …"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Langue */}
            <Text style={styles.label}>Langue de la réunion</Text>
            <TouchableOpacity style={[styles.input, styles.picker]} onPress={() => setShowLangs(!showLangs)}>
              <Text style={{ color: COLORS.textPrimary, flex: 1 }}>{langueLabel}</Text>
              <Ionicons name={showLangs ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            {showLangs && (
              <View style={styles.dropdown}>
                {LANGUES.map(l => (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.dropdownItem, langue === l.code && styles.dropdownItemActive]}
                    onPress={() => { setLangue(l.code); setShowLangs(false); }}
                  >
                    <Text style={[styles.dropdownText, langue === l.code && { color: "#3B82F6" }]}>{l.label}</Text>
                    {langue === l.code && <Ionicons name="checkmark" size={16} color="#3B82F6" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Enregistrement audio ────────────────────────────────────── */}
            <Text style={styles.label}>Enregistrement audio</Text>
            <View style={styles.recBox}>
              {isRecording && (
                <View style={styles.recTimer}>
                  <View style={[styles.recDot, isPaused && { backgroundColor: "#94A3B8" }]} />
                  <Text style={styles.recTime}>
                    {isPaused ? "En pause" : "Enregistrement"} — {fmtDur(duration)}
                  </Text>
                </View>
              )}

              {transcribing ? (
                <View style={styles.transcribingRow}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={{ color: "#93C5FD", fontSize: 13, marginLeft: 8 }}>Yukpo transcrit votre réunion…</Text>
                </View>
              ) : !isRecording ? (
                <TouchableOpacity
                  style={[styles.recBtn, !audioSupported && styles.btnDisabled]}
                  onPress={handleStartRecording}
                  disabled={!audioSupported}
                >
                  <Ionicons name="mic" size={18} color="#fff" />
                  <Text style={styles.recBtnText}>
                    {audioSupported ? "Démarrer l'enregistrement" : "expo-av requis (npm install expo-av)"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={[styles.recBtn, styles.recBtnAmber, { flex: 1 }]} onPress={handlePauseResume}>
                    <Ionicons name={isPaused ? "play" : "pause"} size={16} color="#fff" />
                    <Text style={styles.recBtnText}>{isPaused ? "Reprendre" : "Pause"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.recBtn, styles.recBtnStop, { flex: 2 }]} onPress={handleStopAndTranscribe}>
                    <Ionicons name="stop" size={16} color="#fff" />
                    <Text style={styles.recBtnText}>Arrêter et transcrire</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Notes manuelles */}
            <Text style={styles.label}>Notes textuelles *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Saisissez les notes ou utilisez l'enregistrement…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.infoBox}>
              <Ionicons name="sparkles-outline" size={14} color="#93C5FD" />
              <Text style={styles.infoText}>
                Yukpo transcrit automatiquement en 15+ langues et génère un rapport avec participants, décisions et plan d'action.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.footerBtn, styles.footerCancel]} onPress={() => { resetForm(); setShowForm(false); }}>
              <Text style={styles.footerCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerSave, (isRecording || transcribing) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isRecording || transcribing}
            >
              <Ionicons name="save-outline" size={16} color="#fff" />
              <Text style={styles.footerSaveText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal Rapport ─────────────────────────────────────────────────────── */}
      {selectedRapport && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedRapport.titre}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                  {selectedRapport.date}{selectedRapport.dureeEnreg ? ` · ${fmtDur(selectedRapport.dureeEnreg)}` : ""}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {selectedRapport.fichierRapport && (
                  <TouchableOpacity onPress={() => Linking.openURL(generateurApi.urlTelechargement(selectedRapport.fichierRapport!))}>
                    <Ionicons name="download-outline" size={22} color="#3B82F6" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleShare(selectedRapport.rapport || "", selectedRapport.titre)}>
                  <Ionicons name="share-outline" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.flex} contentContainerStyle={styles.rapportContent}>
              <Markdown style={rapportMarkdownStyles}>{selectedRapport.rapport || ""}</Markdown>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

// ── Markdown styles (rapport modal) ──────────────────────────────────────────

const rapportMarkdownStyles: Record<string, object> = {
  body:         { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  heading1:     { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  heading2:     { color: COLORS.textPrimary, fontSize: 17, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  heading3:     { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  strong:       { fontWeight: "bold", color: COLORS.textPrimary },
  em:           { fontStyle: "italic" },
  bullet_list:  { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item:    { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  code_inline:  { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, paddingHorizontal: 4, fontFamily: "monospace", color: "#A5B4FC" },
  fence:        { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 12, marginVertical: 8, color: "#E2E8F0", fontFamily: "monospace", fontSize: 12 },
  blockquote:   { borderLeftWidth: 3, borderLeftColor: "#3B82F6", paddingLeft: 12, marginVertical: 6, opacity: 0.85 },
  hr:           { borderBottomWidth: 1, borderBottomColor: "#374151", marginVertical: 12 },
  table:        { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 8, marginVertical: 8 },
  th:           { backgroundColor: "rgba(59,130,246,0.15)", padding: 8, color: COLORS.textPrimary, fontWeight: "bold", fontSize: 12 },
  td:           { padding: 8, color: COLORS.textPrimary, fontSize: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  flex:             { flex: 1 },
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  headerTitle:      { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  headerSub:        { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn:           { width: 40, height: 40, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  content:          { padding: 16, paddingBottom: 32, gap: 12 },
  empty:            { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:        { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle:       { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 8 },
  emptyText:        { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  emptyBtn:         { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#3B82F6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText:     { color: "#fff", fontWeight: "600", fontSize: 14 },
  card:             { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  cardHeader:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  cardInfo:         { flex: 1 },
  cardTitle:        { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15 },
  cardDate:         { color: COLORS.textMuted, fontSize: 11 },
  cardStatus:       { marginLeft: 8, marginTop: 2 },
  cardNotes:        { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cardActions:      { flexDirection: "row", gap: 8 },
  btn:              { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnText:          { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnBlue:          { backgroundColor: "#3B82F6", flex: 1, justifyContent: "center" },
  btnGreen:         { backgroundColor: "#16A34A", flex: 1, justifyContent: "center" },
  btnGray:          { backgroundColor: "#475569" },
  btnRed:           { backgroundColor: "#DC2626", paddingHorizontal: 10 },
  btnDisabled:      { opacity: 0.5 },

  // Modal
  modal:            { flex: 1, backgroundColor: COLORS.bg },
  modalHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  modalTitle:       { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, flex: 1 },
  modalContent:     { padding: 20, paddingBottom: 32, gap: 4 },
  label:            { color: COLORS.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input:            { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#374151", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  textarea:         { minHeight: 120 },
  picker:           { flexDirection: "row", alignItems: "center" },
  dropdown:         { backgroundColor: "rgba(30,41,59,0.98)", borderWidth: 1, borderColor: "#374151", borderRadius: 12, marginTop: 4, overflow: "hidden" },
  dropdownItem:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  dropdownItemActive:{ backgroundColor: "rgba(59,130,246,0.12)" },
  dropdownText:     { color: COLORS.textPrimary, fontSize: 14 },

  // Enregistrement
  recBox:           { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 8 },
  recTimer:         { flexDirection: "row", alignItems: "center", gap: 8 },
  recDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  recTime:          { color: "#F87171", fontSize: 13, fontWeight: "600" },
  recBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 10 },
  recBtnAmber:      { backgroundColor: "#D97706" },
  recBtnStop:       { backgroundColor: "#475569" },
  recBtnText:       { color: "#fff", fontWeight: "600", fontSize: 13 },
  transcribingRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 8 },

  infoBox:          { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(59,130,246,0.1)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.25)", marginTop: 8 },
  infoText:         { color: "#93C5FD", fontSize: 12, lineHeight: 18, flex: 1 },

  modalFooter:      { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 32 : 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  footerBtn:        { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  footerCancel:     { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#374151" },
  footerCancelText: { color: COLORS.textMuted, fontWeight: "600" },
  footerSave:       { backgroundColor: "#3B82F6" },
  footerSaveText:   { color: "#fff", fontWeight: "700" },

  rapportContent:   { padding: 20, paddingBottom: 40 },
  rapportText:      { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
});
