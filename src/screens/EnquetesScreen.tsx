/**
 * Enquêtes & Études — Yukpo Pro Mobile
 * Workflow complet : créer étude → audio terrain → transcription → formulaire IA
 * → XLSForm ODK/KoBoCollect → analyse thématique/quantitative/intelligente → rapport
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Alert, ActivityIndicator, Share, Platform, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { COLORS } from "@/store";
import { enquetesApi } from "@/api/client";

let Audio: any = null;
try { Audio = require("expo-av").Audio; } catch (_) {}

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode        = "qualitatif" | "quantitatif" | "mixte";
type Methodo     = "exploratoire" | "phenomenologique" | "theorie_ancree" | "ethnographique";
type Statut      = "brouillon" | "transcription" | "analyse" | "rapport_pret";
type DetailTab   = "audio" | "formulaire" | "analyse" | "rapport";

interface Theme { code: string; libelle: string; frequence: number; citations: string[]; sentiment: string; }
interface Transcription { locuteur: string; fichier: string; duree_estimee_min: number; extrait: string; longueur: number; }
interface Etude {
  etude_id: string; titre: string; contexte: string; methodologie: Methodo;
  terrain: string; mode: Mode; statut: Statut; n_transcriptions: number;
  n_themes: number; n_reponses?: number; has_analyse?: boolean; has_rapport?: boolean;
  rapport_texte?: string; themes?: Theme[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MODES: { value: Mode; label: string; desc: string; icon: string }[] = [
  { value: "qualitatif",  label: "Qualitatif",  desc: "Entretiens, observations terrain", icon: "mic-outline" },
  { value: "quantitatif", label: "Quantitatif", desc: "Formulaires, questionnaires",       icon: "bar-chart-outline" },
  { value: "mixte",       label: "Mixte",       desc: "Entretiens + données chiffrées",    icon: "git-merge-outline" },
];
const METHODOS: { value: Methodo; label: string }[] = [
  { value: "exploratoire",      label: "Exploratoire" },
  { value: "phenomenologique",  label: "Phénoménologique" },
  { value: "theorie_ancree",    label: "Théorie ancrée" },
  { value: "ethnographique",    label: "Ethnographique" },
];

const STATUT_LABEL: Record<Statut, string> = {
  brouillon: "Brouillon", transcription: "Transcrit", analyse: "Analysé", rapport_pret: "Rapport prêt",
};
const STATUT_COLOR: Record<Statut, string> = {
  brouillon: "#94A3B8", transcription: "#F59E0B", analyse: "#3B82F6", rapport_pret: "#22C55E",
};
const SENTIMENT_COLOR: Record<string, string> = {
  positif: "#22C55E", négatif: "#EF4444", neutre: "#3B82F6", mixte: "#F59E0B",
};
const PIPELINE_STEPS: Statut[] = ["brouillon", "transcription", "analyse", "rapport_pret"];

const fmtDur = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

// ── Composant principal ───────────────────────────────────────────────────────

export const EnquetesScreen = ({ navigation }: any) => {
  const [etudes,      setEtudes]      = useState<Etude[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [activeEtude, setActive]      = useState<Etude | null>(null);
  const [activeTab,   setActiveTab]   = useState<DetailTab>("audio");

  // Création
  const [titre,        setTitre]        = useState("");
  const [contexte,     setContexte]     = useState("");
  const [terrain,      setTerrain]      = useState("");
  const [population,   setPopulation]   = useState("");
  const [questions,    setQuestions]    = useState("");
  const [mode,         setMode]         = useState<Mode>("qualitatif");
  const [methodo,      setMethodo]      = useState<Methodo>("exploratoire");
  const [formLoading,  setFormLoading]  = useState(false);

  // Audio
  const recordingRef = useRef<any>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRec,        setIsRec]        = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [duration,     setDuration]     = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [locuteur,     setLocuteur]     = useState("Répondant");
  const [transcripts,  setTranscripts]  = useState<Transcription[]>([]);

  // Formulaire IA
  const [showGenIA,    setShowGenIA]    = useState(false);
  const [genIATitre,   setGenIATitre]   = useState("");
  const [genIADesc,    setGenIADesc]    = useState("");
  const [genIAObj,     setGenIAObj]     = useState("");
  const [genIAPop,     setGenIAPop]     = useState("");
  const [genIANb,      setGenIANb]      = useState("15");
  const [generatingFm, setGeneratingFm] = useState(false);
  const [formulaire,   setFormulaire]   = useState<any | null>(null);

  // Analyse
  const [analysing,    setAnalysing]    = useState<string | null>(null);
  const [analyseRes,   setAnalyseRes]   = useState<any | null>(null);

  // Rapport
  const [showRapport,  setShowRapport]  = useState(false);
  const [genRapport,   setGenRapport]   = useState(false);

  const audioOk = !!Audio;

  useEffect(() => {
    chargerEtudes();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── API ───────────────────────────────────────────────────────────────────────

  const chargerEtudes = async () => {
    setLoading(true);
    try {
      const res = await enquetesApi.lister();
      setEtudes(res.etudes as Etude[]);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const refreshEtude = async (id: string) => {
    try {
      const [d, t] = await Promise.all([
        enquetesApi.getEtude(id),
        enquetesApi.listerTranscriptions(id).catch(() => ({ transcriptions: [] })),
      ]);
      setActive({ ...d, rapport_texte: activeEtude?.rapport_texte, themes: activeEtude?.themes });
      setTranscripts(t.transcriptions || []);
      setEtudes(prev => prev.map(e => e.etude_id === id ? { ...e, ...d } : e));
    } catch (_) {}
  };

  const ouvrirEtude = async (etude: Etude) => {
    setActive(etude);
    setActiveTab("audio");
    setFormulaire(null); setAnalyseRes(null);
    setTranscripts([]);
    try {
      const [d, t] = await Promise.all([
        enquetesApi.getEtude(etude.etude_id),
        enquetesApi.listerTranscriptions(etude.etude_id).catch(() => ({ transcriptions: [] })),
      ]);
      setActive({ ...etude, ...d });
      setTranscripts(t.transcriptions || []);
    } catch (_) {}
  };

  const resetCreate = () => {
    setTitre(""); setContexte(""); setTerrain(""); setPopulation("");
    setQuestions(""); setMode("qualitatif"); setMethodo("exploratoire");
  };

  // ── Créer étude ──────────────────────────────────────────────────────────────

  const handleCreer = async () => {
    if (!titre.trim()) { Alert.alert("Titre requis"); return; }
    if (!contexte.trim()) { Alert.alert("Contexte requis"); return; }
    setFormLoading(true);
    try {
      await enquetesApi.creer({
        titre: titre.trim(), contexte: contexte.trim(),
        questions_recherche: questions.split("\n").map(q => q.trim()).filter(Boolean),
        methodologie: methodo, population_cible: population.trim(),
        terrain: terrain.trim(), mode,
      });
      await chargerEtudes();
      resetCreate();
      setShowCreate(false);
      Alert.alert("Étude créée !", "Sélectionnez-la pour commencer la collecte.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Création échouée");
    } finally { setFormLoading(false); }
  };

  // ── Enregistrement ───────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!Audio) { Alert.alert("expo-av requis"); return; }
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") { Alert.alert("Microphone requis"); return; }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRec(true); setIsPaused(false); setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err: any) { Alert.alert("Erreur", err.message); }
  };

  const handlePauseResume = async () => {
    if (!recordingRef.current) return;
    const st = await recordingRef.current.getStatusAsync();
    if (st.isRecording) {
      await recordingRef.current.pauseAsync(); setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      await recordingRef.current.startAsync(); setIsPaused(false);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
  };

  const handleStop = async () => {
    if (!recordingRef.current || !activeEtude) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRec(false); setIsPaused(false);
      if (!uri) throw new Error("URI introuvable");
      const res = await enquetesApi.uploaderAudio(activeEtude.etude_id, uri, locuteur, "fr");
      await refreshEtude(activeEtude.etude_id);
      Alert.alert("Transcrit !", `${res.longueur_totale} caractères.\n\n"${res.extrait}"`);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || err.message);
    } finally { setTranscribing(false); }
  };

  // ── Génération formulaire IA ──────────────────────────────────────────────────

  const handleGenFormIA = async () => {
    if (!genIATitre || !genIADesc) { Alert.alert("Titre et description requis"); return; }
    setGeneratingFm(true);
    try {
      const res = await enquetesApi.genererFormulaireIa({
        titre: genIATitre, description: genIADesc, objectif: genIAObj,
        population: genIAPop, n_questions: parseInt(genIANb) || 15,
        creer_dans_etude: activeEtude?.etude_id,
      });
      setFormulaire(res);
      setShowGenIA(false);
      await refreshEtude(activeEtude!.etude_id);
      Alert.alert(
        "Formulaire généré !",
        `"${res.titre_formulaire}" — ${res.questions?.length || 0} questions\nDéployable sur KoBoCollect / ODK via XLSForm.`,
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Génération échouée");
    } finally { setGeneratingFm(false); }
  };

  // ── Analyses ─────────────────────────────────────────────────────────────────

  const handleAnalyse = async (type: "qualitative" | "quantitative" | "intelligente" | "commentaires") => {
    if (!activeEtude) return;
    const labels: Record<string, string> = {
      qualitative: "Codage thématique", quantitative: "Analyse statistique",
      intelligente: "Analyse ciblée Yukpo", commentaires: "Questions ouvertes",
    };
    setAnalysing(type);
    try {
      let res;
      if (type === "qualitative")   res = await enquetesApi.analyser(activeEtude.etude_id);
      else if (type === "quantitative") res = await enquetesApi.analyserQuantitatif(activeEtude.etude_id);
      else if (type === "intelligente") res = await enquetesApi.analyserIntelligent(activeEtude.etude_id);
      else res = await enquetesApi.analyserCommentaires(activeEtude.etude_id);
      setAnalyseRes({ ...res, _type: type });
      await refreshEtude(activeEtude.etude_id);
      Alert.alert(
        `${labels[type]} terminée`,
        type === "qualitative" ? `${res.n_themes} thème(s) identifié(s)` :
        type === "intelligente" ? `${res.n_croisements || 0} croisement(s) pertinent(s)` : "Analyse disponible",
        [{ text: "Voir le rapport", onPress: () => handleGenRapport() }, { text: "Plus tard" }],
      );
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Analyse échouée");
    } finally { setAnalysing(null); }
  };

  // ── Rapport ───────────────────────────────────────────────────────────────────

  const handleGenRapport = async () => {
    if (!activeEtude) return;
    setGenRapport(true);
    try {
      const res = await enquetesApi.genererRapport(activeEtude.etude_id, "json");
      const updated: Etude = {
        ...activeEtude, statut: "rapport_pret",
        rapport_texte: res.rapport_texte, themes: res.themes, n_themes: res.n_themes,
      };
      setActive(updated);
      setEtudes(prev => prev.map(e => e.etude_id === activeEtude.etude_id ? updated : e));
      setShowRapport(true);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Génération échouée");
    } finally { setGenRapport(false); }
  };

  const handleShare = async () => {
    if (!activeEtude?.rapport_texte) return;
    await Share.share({ message: activeEtude.rapport_texte, title: activeEtude.titre });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Enquêtes & Études</Text>
          <Text style={s.headerSub}>Terrain · Transcription · Formulaire ODK · Rapport</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color="#7B3FE4" style={{ marginTop: 40 }} />}

        {!loading && etudes.length === 0 && (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="analytics-outline" size={36} color="#7B3FE4" /></View>
            <Text style={s.emptyTitle}>Aucune étude</Text>
            <Text style={s.emptyText}>Créez une étude, enregistrez vos entretiens ou générez un formulaire — Yukpo analyse et produit un rapport académique complet.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnText}>Nouvelle étude</Text>
            </TouchableOpacity>
          </View>
        )}

        {etudes.map(etude => {
          const idx = PIPELINE_STEPS.indexOf(etude.statut);
          return (
            <TouchableOpacity key={etude.etude_id} style={s.card} onPress={() => ouvrirEtude(etude)} activeOpacity={0.85}>
              {/* Pipeline mini */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 8 }}>
                {PIPELINE_STEPS.map((step, i) => (
                  <View key={step} style={[s.pipeStep, i <= idx ? { backgroundColor: "#7B3FE4", width: 24 } : { backgroundColor: "rgba(255,255,255,0.08)", width: 12 }]} />
                ))}
                <View style={[s.badge, { backgroundColor: STATUT_COLOR[etude.statut] + "22", marginLeft: 6 }]}>
                  <Text style={[s.badgeTxt, { color: STATUT_COLOR[etude.statut] }]}>{STATUT_LABEL[etude.statut]}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{etude.titre}</Text>
                  <Text style={s.cardCtx} numberOfLines={2}>{etude.contexte}</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="mic-outline" size={11} color="#94A3B8" />
                      <Text style={s.cardMeta}>{etude.n_transcriptions} audio{etude.n_transcriptions !== 1 ? "s" : ""}</Text>
                    </View>
                    {(etude.n_reponses ?? 0) > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="people-outline" size={11} color="#94A3B8" />
                        <Text style={s.cardMeta}>{etude.n_reponses} réponses</Text>
                      </View>
                    )}
                    <View style={[s.modeBadge]}>
                      <Text style={s.modeBadgeTxt}>{etude.mode}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#4B5563" style={{ marginLeft: 8, marginTop: 2 }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Modal : Détail étude (tabs) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!activeEtude && !showRapport && !showGenIA} animationType="slide" presentationStyle="pageSheet">
        {activeEtude && (
          <View style={s.modal}>
            {/* En-tête */}
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle} numberOfLines={1}>{activeEtude.titre}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <View style={[s.badge, { backgroundColor: STATUT_COLOR[activeEtude.statut] + "22" }]}>
                    <Text style={[s.badgeTxt, { color: STATUT_COLOR[activeEtude.statut] }]}>{STATUT_LABEL[activeEtude.statut]}</Text>
                  </View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{activeEtude.mode}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setActive(null); }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Onglets */}
            <View style={s.tabs}>
              {([
                { key: "audio",      icon: "mic-outline",           label: "Audios" },
                { key: "formulaire", icon: "clipboard-outline",     label: "Formulaire" },
                { key: "analyse",    icon: "analytics-outline",     label: "Analyse" },
                { key: "rapport",    icon: "document-text-outline", label: "Rapport" },
              ] as { key: DetailTab; icon: any; label: string }[]).map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tab, activeTab === tab.key && s.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? "#7B3FE4" : "#94A3B8"} />
                  <Text style={[s.tabTxt, activeTab === tab.key && s.tabTxtActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contenu */}
            <ScrollView style={s.flex} contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Audio ── */}
              {activeTab === "audio" && (
                <View style={{ gap: 14 }}>
                  <Text style={s.sectionLabel}>Enregistreur terrain</Text>
                  <TextInput style={s.input} value={locuteur} onChangeText={setLocuteur}
                    placeholder="Nom / identifiant du répondant" placeholderTextColor={COLORS.textMuted} />

                  <View style={s.recBox}>
                    {isRec && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <View style={[s.recDot, isPaused && { backgroundColor: "#94A3B8" }]} />
                        <Text style={{ color: isPaused ? "#94A3B8" : "#F87171", fontWeight: "600" }}>
                          {isPaused ? "Pause" : "Enregistrement"} — {fmtDur(duration)}
                        </Text>
                      </View>
                    )}
                    {transcribing ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" color="#7B3FE4" />
                        <Text style={{ color: "#A78BFA", fontSize: 13 }}>Yukpo transcrit l'entretien…</Text>
                      </View>
                    ) : !isRec ? (
                      <TouchableOpacity style={[s.recBtn, !audioOk && { opacity: 0.5 }]} onPress={handleStart} disabled={!audioOk}>
                        <Ionicons name="mic" size={18} color="#fff" />
                        <Text style={s.recBtnTxt}>{audioOk ? "Démarrer l'entretien" : "expo-av requis"}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity style={[s.recBtn, s.recBtnAmber, { flex: 1 }]} onPress={handlePauseResume}>
                          <Ionicons name={isPaused ? "play" : "pause"} size={16} color="#fff" />
                          <Text style={s.recBtnTxt}>{isPaused ? "Reprendre" : "Pause"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.recBtn, s.recBtnSlate, { flex: 2 }]} onPress={handleStop}>
                          <Ionicons name="stop" size={16} color="#fff" />
                          <Text style={s.recBtnTxt}>Arrêter & transcrire</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Transcriptions */}
                  {transcripts.length > 0 && (
                    <View>
                      <Text style={s.sectionLabel}>{transcripts.length} entretien(s) transcrit(s)</Text>
                      {transcripts.map((t, i) => (
                        <View key={i} style={s.transcriptCard}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ color: COLORS.textPrimary, fontWeight: "600", fontSize: 13 }}>{t.locuteur}</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{t.duree_estimee_min} min · {(t.longueur / 1000).toFixed(1)}k car.</Text>
                          </View>
                          <Text style={{ color: "#93C5FD", fontSize: 12, fontStyle: "italic" }} numberOfLines={2}>« {t.extrait} »</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {transcripts.length === 0 && (
                    <View style={s.infoBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#A78BFA" />
                      <Text style={s.infoTxt}>Enregistrez au moins un entretien. Chaque entretien est transcrit séparément pour une analyse de saturation précise.</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── Formulaire ── */}
              {activeTab === "formulaire" && (
                <View style={{ gap: 12 }}>
                  {activeEtude.mode === "qualitatif" ? (
                    <View style={s.infoBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#A78BFA" />
                      <Text style={s.infoTxt}>En mode qualitatif, la collecte se fait via entretiens (onglet Audios). Passez en mode mixte ou quantitatif pour activer les formulaires.</Text>
                    </View>
                  ) : (
                    <>
                      {!formulaire && (
                        <>
                          {/* Génération IA */}
                          <TouchableOpacity style={s.genIACard} onPress={() => setShowGenIA(true)}>
                            <View style={s.genIAIcon}><Ionicons name="sparkles" size={20} color="#7B3FE4" /></View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.genIATitle}>Générer le formulaire avec Yukpo</Text>
                              <Text style={s.genIADesc}>Formulaire professionnel avec sections, skip logic, contraintes — exportable XLSForm pour KoBoCollect / ODK / SurveyCTO</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
                          </TouchableOpacity>

                          <View style={s.divider} />

                          <Text style={[s.sectionLabel, { marginBottom: 0 }]}>Ou créer manuellement</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                            Utilisez l'API POST /enquetes/{"{etude_id}"}/formulaire pour créer un formulaire personnalisé.
                          </Text>
                        </>
                      )}

                      {/* Formulaire généré */}
                      {formulaire && (
                        <View style={{ gap: 10 }}>
                          <View style={[s.infoBox, { borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.06)" }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                            <Text style={[s.infoTxt, { color: "#86EFAC" }]}>
                              "{formulaire.titre_formulaire}" — {formulaire.questions?.length || 0} questions générées
                            </Text>
                          </View>

                          {/* Sections */}
                          {formulaire.sections_metadata?.length > 0 && (
                            <View>
                              <Text style={s.sectionLabel}>Sections du formulaire</Text>
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                {formulaire.sections_metadata.map((sec: any, i: number) => (
                                  <View key={i} style={s.sectionChip}>
                                    <Text style={s.sectionChipTxt}>{sec.titre}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}

                          {/* Actions */}
                          <Text style={s.sectionLabel}>Actions</Text>
                          {formulaire.lien_collecte && (
                            <View style={s.actionRow}>
                              <Ionicons name="link-outline" size={16} color="#3B82F6" />
                              <Text style={{ color: "#93C5FD", fontSize: 12, flex: 1 }} numberOfLines={1}>
                                Lien collecte : {formulaire.lien_collecte}
                              </Text>
                            </View>
                          )}

                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity style={[s.actionBtn, { borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.08)" }]}>
                              <Ionicons name="grid-outline" size={14} color="#22C55E" />
                              <Text style={[s.actionBtnTxt, { color: "#22C55E" }]}>XLSForm (ODK)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.actionBtn, { borderColor: "rgba(123,63,228,0.3)", backgroundColor: "rgba(123,63,228,0.08)" }]} onPress={() => setShowGenIA(true)}>
                              <Ionicons name="sparkles-outline" size={14} color="#A78BFA" />
                              <Text style={[s.actionBtnTxt, { color: "#A78BFA" }]}>Regénérer</Text>
                            </TouchableOpacity>
                          </View>

                          {(activeEtude.n_reponses ?? 0) > 0 && (
                            <View style={[s.infoBox, { borderColor: "rgba(59,130,246,0.3)" }]}>
                              <Ionicons name="people-outline" size={14} color="#60A5FA" />
                              <Text style={[s.infoTxt, { color: "#93C5FD" }]}>{activeEtude.n_reponses} réponse(s) collectée(s) — analysable dans l'onglet Analyse</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* ── Analyse ── */}
              {activeTab === "analyse" && (
                <View style={{ gap: 10 }}>
                  {activeEtude.n_transcriptions === 0 && (activeEtude.n_reponses ?? 0) === 0 && (
                    <View style={[s.infoBox, { borderColor: "rgba(251,191,36,0.3)", backgroundColor: "rgba(251,191,36,0.06)" }]}>
                      <Ionicons name="warning-outline" size={14} color="#FCD34D" />
                      <Text style={[s.infoTxt, { color: "#FCD34D" }]}>Uploadez des audios ou collectez des réponses avant d'analyser.</Text>
                    </View>
                  )}

                  {/* Qualitative */}
                  {activeEtude.mode !== "quantitatif" && (
                    <AnalyseMobileCard
                      icon="brain-outline" couleur="#7B3FE4"
                      titre="Codage thématique"
                      desc="Yukpo identifie les thèmes émergents, patterns et saturation dans vos entretiens"
                      loading={analysing === "qualitative"}
                      disabled={activeEtude.n_transcriptions === 0}
                      done={!!activeEtude.has_analyse}
                      onPress={() => handleAnalyse("qualitative")}
                    />
                  )}

                  {/* Quantitative */}
                  {activeEtude.mode !== "qualitatif" && (
                    <AnalyseMobileCard
                      icon="bar-chart-outline" couleur="#3B82F6"
                      titre="Analyse statistique"
                      desc="Fréquences et distributions de toutes les questions fermées du formulaire"
                      loading={analysing === "quantitative"}
                      disabled={(activeEtude.n_reponses ?? 0) === 0}
                      done={false}
                      onPress={() => handleAnalyse("quantitative")}
                    />
                  )}

                  {/* Intelligente */}
                  {activeEtude.mode !== "qualitatif" && (
                    <AnalyseMobileCard
                      icon="flash-outline" couleur="#06B6D4"
                      titre="Analyse ciblée Yukpo"
                      desc="Yukpo sélectionne les croisements et corrélations pertinents selon votre contexte. Chi², Cramér's V, graphiques."
                      loading={analysing === "intelligente"}
                      disabled={(activeEtude.n_reponses ?? 0) < 5}
                      done={false}
                      onPress={() => handleAnalyse("intelligente")}
                    />
                  )}

                  {/* Commentaires */}
                  {activeEtude.mode !== "qualitatif" && (
                    <AnalyseMobileCard
                      icon="chatbubbles-outline" couleur="#F59E0B"
                      titre="Questions ouvertes"
                      desc="Analyse thématique et sentimentale des réponses libres du formulaire"
                      loading={analysing === "commentaires"}
                      disabled={(activeEtude.n_reponses ?? 0) === 0}
                      done={false}
                      onPress={() => handleAnalyse("commentaires")}
                    />
                  )}

                  {/* Résultats */}
                  {analyseRes && (
                    <View>
                      <Text style={s.sectionLabel}>Résultats</Text>
                      {analyseRes.n_themes > 0 && (
                        <Text style={{ color: "#A78BFA", fontSize: 13, marginBottom: 6 }}>{analyseRes.n_themes} thème(s) identifié(s){analyseRes.saturation ? " · Saturation atteinte ✓" : ""}</Text>
                      )}
                      {analyseRes.hypotheses?.map((h: string, i: number) => (
                        <Text key={i} style={{ color: "#93C5FD", fontSize: 12, marginBottom: 4 }}>H{i+1}: {h}</Text>
                      ))}
                      {analyseRes.croisements_cibles?.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {analyseRes.croisements_cibles.map((c: any, i: number) => (
                            <View key={i} style={[s.sectionChip, { borderColor: "rgba(6,182,212,0.3)", backgroundColor: "rgba(6,182,212,0.08)" }]}>
                              <Text style={[s.sectionChipTxt, { color: "#67E8F9" }]}>{c.var1} × {c.var2}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* CTA rapport */}
                  {activeEtude.has_analyse && (
                    <TouchableOpacity style={[s.bigBtn, { marginTop: 8 }]} onPress={() => setActiveTab("rapport")}>
                      <Ionicons name="document-text-outline" size={16} color="#fff" />
                      <Text style={s.bigBtnTxt}>Générer le rapport →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ── Rapport ── */}
              {activeTab === "rapport" && (
                <View style={{ gap: 12 }}>
                  {!activeEtude.has_analyse && (
                    <View style={[s.infoBox, { borderColor: "rgba(251,191,36,0.3)", backgroundColor: "rgba(251,191,36,0.06)" }]}>
                      <Ionicons name="warning-outline" size={14} color="#FCD34D" />
                      <Text style={[s.infoTxt, { color: "#FCD34D" }]}>Lancez une analyse d'abord (onglet Analyse).</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[s.bigBtn, (!activeEtude.has_analyse || genRapport) && { opacity: 0.5 }]}
                    onPress={handleGenRapport}
                    disabled={!activeEtude.has_analyse || genRapport}
                  >
                    {genRapport ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="reader-outline" size={16} color="#fff" />}
                    <Text style={s.bigBtnTxt}>{genRapport ? "Génération…" : activeEtude.has_rapport ? "Regénérer le rapport" : "Générer le rapport académique"}</Text>
                  </TouchableOpacity>

                  {activeEtude.statut === "rapport_pret" && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity style={[s.actionBtn, { flex: 1, justifyContent: "center", borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.08)" }]}
                        onPress={() => setShowRapport(true)}>
                        <Ionicons name="eye-outline" size={14} color="#22C55E" />
                        <Text style={[s.actionBtnTxt, { color: "#22C55E" }]}>Lire le rapport</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, { flex: 1, justifyContent: "center", borderColor: "rgba(148,163,184,0.3)", backgroundColor: "rgba(148,163,184,0.06)" }]}
                        onPress={handleShare}>
                        <Ionicons name="share-outline" size={14} color="#94A3B8" />
                        <Text style={[s.actionBtnTxt, { color: "#94A3B8" }]}>Partager</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Modal : Génération formulaire IA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showGenIA} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Générer le formulaire</Text>
            <TouchableOpacity onPress={() => setShowGenIA(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.flex} contentContainerStyle={s.tabContent} keyboardShouldPersistTaps="handled">
            <View style={[s.infoBox, { borderColor: "rgba(123,63,228,0.3)", backgroundColor: "rgba(123,63,228,0.08)", marginBottom: 12 }]}>
              <Ionicons name="sparkles" size={14} color="#A78BFA" />
              <Text style={[s.infoTxt, { color: "#C4B5FD" }]}>Yukpo génère un formulaire professionnel avec sections, logique de saut et contraintes. Exportable XLSForm pour KoBoCollect, ODK et SurveyCTO.</Text>
            </View>
            <Text style={s.sectionLabel}>Titre du formulaire *</Text>
            <TextInput style={s.input} value={genIATitre} onChangeText={setGenIATitre} placeholder="Enquête satisfaction soins primaires" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.sectionLabel}>Population cible *</Text>
            <TextInput style={s.input} value={genIAPop} onChangeText={setGenIAPop} placeholder="Patients, ménages, bénéficiaires" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.sectionLabel}>Description du sujet *</Text>
            <TextInput style={[s.input, s.textarea]} value={genIADesc} onChangeText={setGenIADesc} placeholder="Contexte, thèmes à couvrir, enjeux spécifiques…" placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
            <Text style={s.sectionLabel}>Objectif principal</Text>
            <TextInput style={s.input} value={genIAObj} onChangeText={setGenIAObj} placeholder="Mesurer la satisfaction, identifier les barrières…" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.sectionLabel}>Nombre de questions</Text>
            <TextInput style={s.input} value={genIANb} onChangeText={setGenIANb} keyboardType="numeric" placeholder="15" placeholderTextColor={COLORS.textMuted} />
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.footerBtn, s.footerCancel]} onPress={() => setShowGenIA(false)}>
              <Text style={s.footerCancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.footerBtn, s.footerSave, generatingFm && { opacity: 0.6 }]} onPress={handleGenFormIA} disabled={generatingFm}>
              {generatingFm ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={16} color="#fff" />}
              <Text style={s.footerSaveTxt}>{generatingFm ? "Génération…" : "Générer"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Modal : Rapport */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showRapport && activeEtude && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle} numberOfLines={1}>{activeEtude.titre}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{activeEtude.n_transcriptions} entretien(s) · {activeEtude.n_themes} thème(s)</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <TouchableOpacity onPress={handleShare}><Ionicons name="share-outline" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRapport(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
              </View>
            </View>
            <ScrollView style={s.flex} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
              {/* Thèmes */}
              {activeEtude.themes && activeEtude.themes.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={s.sectionTitle}>Thèmes identifiés</Text>
                  {activeEtude.themes.map((t, i) => (
                    <View key={t.code ?? i} style={s.themeCard}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <View style={[s.sentBadge, { backgroundColor: (SENTIMENT_COLOR[t.sentiment] ?? "#94A3B8") + "33" }]}>
                          <Text style={[s.sentBadgeTxt, { color: SENTIMENT_COLOR[t.sentiment] ?? "#94A3B8" }]}>{t.sentiment}</Text>
                        </View>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{t.frequence}× cité</Text>
                      </View>
                      <Text style={s.themeLibelle}>{t.libelle}</Text>
                      {t.citations?.slice(0, 2).map((c, ci) => (
                        <Text key={ci} style={s.citation}>« {c} »</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
              <Text style={s.sectionTitle}>Rapport complet</Text>
              <Markdown style={mdStyles}>{activeEtude.rapport_texte || ""}</Markdown>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Modal : Nouvelle étude */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nouvelle étude</Text>
            <TouchableOpacity onPress={() => { resetCreate(); setShowCreate(false); }}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.flex} contentContainerStyle={s.tabContent} keyboardShouldPersistTaps="handled">
            <Text style={s.sectionLabel}>Titre *</Text>
            <TextInput style={s.input} value={titre} onChangeText={setTitre} placeholder="Perceptions de la couverture maladie…" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.sectionLabel}>Contexte & objectif *</Text>
            <TextInput style={[s.input, s.textarea]} value={contexte} onChangeText={setContexte} placeholder="Décrivez la problématique et les objectifs de l'étude…" placeholderTextColor={COLORS.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
            <Text style={s.sectionLabel}>Questions de recherche (une par ligne)</Text>
            <TextInput style={[s.input, s.textarea]} value={questions} onChangeText={setQuestions} placeholder={"Quels sont les obstacles ?\nQuelle est la perception du système ?"} placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
            <Text style={s.sectionLabel}>Terrain / Zone</Text>
            <TextInput style={s.input} value={terrain} onChangeText={setTerrain} placeholder="Douala-Bépanda, Marché central Yaoundé…" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.sectionLabel}>Population cible</Text>
            <TextInput style={s.input} value={population} onChangeText={setPopulation} placeholder="Commerçants, ménages ruraux, étudiants…" placeholderTextColor={COLORS.textMuted} />

            <Text style={s.sectionLabel}>Mode d'étude</Text>
            {MODES.map(m => (
              <TouchableOpacity key={m.value} style={[s.modeCard, mode === m.value && s.modeCardActive]} onPress={() => setMode(m.value)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name={m.icon} size={18} color={mode === m.value ? "#7B3FE4" : "#94A3B8"} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modeLabel, mode === m.value && { color: "#A78BFA" }]}>{m.label}</Text>
                    <Text style={s.modeDesc}>{m.desc}</Text>
                  </View>
                  {mode === m.value && <Ionicons name="checkmark-circle" size={18} color="#7B3FE4" />}
                </View>
              </TouchableOpacity>
            ))}

            <Text style={s.sectionLabel}>Méthodologie</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {METHODOS.map(m => (
                <TouchableOpacity key={m.value} style={[s.methChip, methodo === m.value && s.methChipActive]} onPress={() => setMethodo(m.value)}>
                  <Text style={[s.methChipTxt, methodo === m.value && { color: "#A78BFA" }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.footerBtn, s.footerCancel]} onPress={() => { resetCreate(); setShowCreate(false); }}>
              <Text style={s.footerCancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.footerBtn, s.footerSave, formLoading && { opacity: 0.6 }]} onPress={handleCreer} disabled={formLoading}>
              {formLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
              <Text style={s.footerSaveTxt}>Créer l'étude</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Sous-composant AnalyseMobileCard ─────────────────────────────────────────

const AnalyseMobileCard = ({ icon, couleur, titre, desc, loading, disabled, done, onPress }: {
  icon: string; couleur: string; titre: string; desc: string;
  loading: boolean; disabled: boolean; done: boolean; onPress: () => void;
}) => (
  <TouchableOpacity
    style={[s.analyseCard, { borderColor: couleur + "33", backgroundColor: couleur + "0D" }]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={[s.analyseIcon, { backgroundColor: couleur + "22" }]}>
        <Ionicons name={icon as any} size={18} color={couleur} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Text style={[s.analyseTitle, disabled && { opacity: 0.5 }]}>{titre}</Text>
          {done && <Ionicons name="checkmark-circle" size={14} color="#22C55E" />}
        </View>
        <Text style={[s.analyseDesc, disabled && { opacity: 0.4 }]}>{desc}</Text>
      </View>
      {loading
        ? <ActivityIndicator size="small" color={couleur} />
        : <View style={[s.analyseBtn, { backgroundColor: couleur, opacity: disabled ? 0.4 : 1 }]}>
            <Ionicons name="play" size={12} color="#fff" />
          </View>}
    </View>
  </TouchableOpacity>
);

// ── Styles markdown ───────────────────────────────────────────────────────────

const mdStyles: Record<string, object> = {
  body:       { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  heading1:   { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  heading2:   { color: COLORS.textPrimary, fontSize: 17, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  heading3:   { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: "#7B3FE4", paddingLeft: 12, marginVertical: 6, opacity: 0.85 },
};

// ── StyleSheet ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  flex:         { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  headerTitle:  { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  headerSub:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  addBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: "#7B3FE4", alignItems: "center", justifyContent: "center" },
  content:      { padding: 16, paddingBottom: 40, gap: 10 },

  empty:        { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(123,63,228,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 8 },
  emptyText:    { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  emptyBtn:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#7B3FE4", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  card:         { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  pipeStep:     { height: 4, borderRadius: 2 },
  cardTitle:    { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15, marginBottom: 3 },
  cardCtx:      { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  cardMeta:     { color: COLORS.textMuted, fontSize: 11 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTxt:     { fontSize: 10, fontWeight: "700" },
  modeBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modeBadgeTxt: { fontSize: 10, color: "#94A3B8" },

  modal:        { flex: 1, backgroundColor: COLORS.bg },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  modalTitle:   { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, flex: 1 },

  tabs:         { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  tab:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12 },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: "#7B3FE4" },
  tabTxt:       { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  tabTxtActive: { color: "#A78BFA", fontWeight: "700" },
  tabContent:   { padding: 16, paddingBottom: 40 },

  sectionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, marginTop: 10 },
  input:        { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#374151", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  textarea:     { minHeight: 80 },
  modalFooter:  { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 32 : 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  footerBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  footerCancel: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#374151" },
  footerCancelTxt: { color: COLORS.textMuted, fontWeight: "600" },
  footerSave:   { backgroundColor: "#7B3FE4" },
  footerSaveTxt:{ color: "#fff", fontWeight: "700" },

  recBox:       { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  recDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  recBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 10 },
  recBtnAmber:  { backgroundColor: "#D97706" },
  recBtnSlate:  { backgroundColor: "#475569" },
  recBtnTxt:    { color: "#fff", fontWeight: "600", fontSize: 13 },

  transcriptCard:{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 8 },
  infoBox:      { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(123,63,228,0.08)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(123,63,228,0.2)" },
  infoTxt:      { color: "#C4B5FD", fontSize: 12, lineHeight: 18, flex: 1 },

  genIACard:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(123,63,228,0.08)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(123,63,228,0.2)" },
  genIAIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(123,63,228,0.15)", alignItems: "center", justifyContent: "center" },
  genIATitle:   { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14, marginBottom: 3 },
  genIADesc:    { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },

  divider:      { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 8 },
  sectionChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(123,63,228,0.3)", backgroundColor: "rgba(123,63,228,0.1)" },
  sectionChipTxt:{ color: "#A78BFA", fontSize: 11 },
  actionRow:    { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.2)" },
  actionBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  actionBtnTxt: { fontSize: 12, fontWeight: "600" },

  bigBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#7B3FE4", paddingVertical: 14, borderRadius: 12 },
  bigBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 14 },

  analyseCard:  { borderRadius: 14, borderWidth: 1, padding: 14 },
  analyseIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  analyseTitle: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 },
  analyseDesc:  { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  analyseBtn:   { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  modeCard:     { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#374151", marginBottom: 6 },
  modeCardActive:{ borderColor: "#7B3FE4", backgroundColor: "rgba(123,63,228,0.08)" },
  modeLabel:    { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 },
  modeDesc:     { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  methChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#374151", backgroundColor: "rgba(255,255,255,0.04)" },
  methChipActive:{ borderColor: "#7B3FE4", backgroundColor: "rgba(123,63,228,0.1)" },
  methChipTxt:  { color: COLORS.textMuted, fontSize: 12 },

  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  themeCard:    { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10 },
  themeLibelle: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14, marginBottom: 6 },
  citation:     { color: "#93C5FD", fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#7B3FE4" },
  sentBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sentBadgeTxt: { fontSize: 10, fontWeight: "600" },
});
