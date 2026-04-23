/**
 * Générateurs — Rapports, Slides, Traduction (texte + fichier), Historique
 * Synchronisé avec YukpoPro Web : historique persistant + traduction fichier
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, Alert,
  KeyboardAvoidingView, Platform, FlatList, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useColors, type Colors } from "@/store";
import { useNavigation } from "@react-navigation/native";
import { generateurApi, infographieApi, DocumentHistorique, GabaritInfographie, ResultatInfographieReponse } from "@/api/client";
import { useGenerateurStore } from "@/store/generateurStore";

type TabType = "rapport" | "slides" | "traduction" | "fichiers" | "conversion" | "historique" | "modeles" | "infographie";
type InfogMode = "brief" | "manuel" | "modele" | "custom";

interface Template {
  label: string;
  desc: string;
  type: "rapport" | "slides";
  typeDoc: string;
  sujet: string;
  contenu: string;
}
interface CatTemplate { categorie: string; emoji: string; templates: Template[] }

const TEMPLATES: CatTemplate[] = [
  {
    categorie: "Comptabilité & Finance", emoji: "🧮",
    templates: [
      { label: "Bilan SYSCOHADA commenté", desc: "Analyse des ratios : liquidité, solvabilité, rentabilité", type: "rapport", typeDoc: "rapport_financier", sujet: "Bilan comptable SYSCOHADA annoté avec analyse financière", contenu: "Préparer un bilan SYSCOHADA révisé avec ratios clés : liquidité générale, solvabilité, rentabilité des capitaux propres. Inclure tableau de flux de trésorerie et notes explicatives." },
      { label: "Note IS + TVA", desc: "Calcul IS et TVA collectée/déductible selon CGI", type: "rapport", typeDoc: "rapport_financier", sujet: "Note de calcul IS et TVA — exercice fiscal", contenu: "Calcul de l'IS selon le régime applicable et réconciliation TVA (collectée, déductible, solde à décaisser). Référencer le CGI applicable." },
      { label: "Rapport d'audit interne", desc: "Contrôle interne, risques et recommandations", type: "rapport", typeDoc: "rapport_audit", sujet: "Rapport d'audit interne des procédures comptables et financières", contenu: "Évaluation du contrôle interne, identification des risques (fraude, erreurs, non-conformités), recommandations correctives avec plan d'action priorisé." },
      { label: "Slides résultats financiers", desc: "Présentation comité de direction — KPIs & marges", type: "slides", typeDoc: "rapport_financier", sujet: "Résultats financiers — présentation comité de direction", contenu: "KPIs financiers clés, évolution CA, marges, EBITDA, comparaison N-1, écarts vs budget, perspectives et actions correctives." },
    ],
  },
  {
    categorie: "Juridique & Conformité", emoji: "⚖️",
    templates: [
      { label: "Note juridique OHADA", desc: "Analyse selon le droit OHADA et jurisprudence CCJA", type: "rapport", typeDoc: "note_juridique", sujet: "Note juridique — analyse de conformité OHADA", contenu: "Analyse des actes uniformes OHADA applicables, jurisprudence CCJA, risques juridiques identifiés et recommandations pratiques." },
      { label: "Rapport due diligence", desc: "Audit juridique, fiscal et social pour acquisition", type: "rapport", typeDoc: "rapport_audit", sujet: "Rapport de due diligence — acquisition / partenariat stratégique", contenu: "Audit juridique (statuts, contrats, litiges), fiscal (arriérés, redressements), social (CNPS, contrats de travail). Synthèse risques et recommandations." },
      { label: "Note conformité CIMA", desc: "Ratios prudentiels, marge de solvabilité CIMA", type: "rapport", typeDoc: "note_juridique", sujet: "Note de conformité au Code CIMA — compagnie d'assurance", contenu: "Vérification des ratios prudentiels CIMA, marge de solvabilité, provisions techniques, couverture des engagements réglementés. Plan de régularisation si nécessaire." },
    ],
  },
  {
    categorie: "Banque & Microfinance", emoji: "🏦",
    templates: [
      { label: "Analyse crédit PME", desc: "Scoring et décision de financement selon COBAC", type: "rapport", typeDoc: "rapport_financier", sujet: "Analyse crédit PME — dossier de financement", contenu: "Analyse des états financiers SYSCOHADA, scoring crédit, ratios COBAC (endettement, couverture), garanties proposées, recommandation d'octroi avec conditions." },
      { label: "Ratios prudentiels COBAC", desc: "Calcul solvabilité, liquidité, division des risques", type: "rapport", typeDoc: "note_de_synthese", sujet: "Note d'analyse des ratios prudentiels COBAC", contenu: "Calcul des ratios COBAC : solvabilité (8%), liquidité (≥100%), transformation, division des risques. Comparaison vs normes réglementaires." },
      { label: "Slides comité de crédit", desc: "Présentation dossier financement au comité", type: "slides", typeDoc: "rapport_direction", sujet: "Présentation comité de crédit — dossier financement", contenu: "Résumé exécutif du client, analyse financière synthétique, structure du financement proposé, garanties, risques identifiés, recommandation." },
    ],
  },
  {
    categorie: "Commerce & Business", emoji: "📈",
    templates: [
      { label: "Business plan complet", desc: "PESTEL, BMC, projections financières 3 ans", type: "rapport", typeDoc: "rapport_analyse", sujet: "Business plan — création / développement d'activité", contenu: "Executive summary, étude de marché (PESTEL, Porter), modèle économique (BMC), plan marketing, plan opérationnel, projections financières sur 3 ans (P&L, BFR, TRI)." },
      { label: "Pitch deck investisseurs", desc: "Levée de fonds — 8-12 slides impactants", type: "slides", typeDoc: "pitch_projet", sujet: "Pitch deck — levée de fonds startup / PME", contenu: "Problème / Solution, taille du marché, traction (métriques clés), modèle économique, roadmap, équipe, besoins de financement et utilisation des fonds." },
      { label: "Plan de prospection", desc: "Segmentation, ICP, pipeline et KPIs commerciaux", type: "rapport", typeDoc: "plan_action", sujet: "Plan de développement commercial — stratégie prospection", contenu: "Segmentation cibles, ICP (Ideal Customer Profile), argumentaire différencié, plan de prospection (actions, calendrier, KPIs), prévisions de pipeline." },
    ],
  },
  {
    categorie: "ONG & Projets", emoji: "🌍",
    templates: [
      { label: "Rapport d'activités ONG", desc: "Rapport annuel pour bailleurs et partenaires", type: "rapport", typeDoc: "rapport_analyse", sujet: "Rapport annuel d'activités — organisation", contenu: "Résumé exécutif, réalisations par axe stratégique, indicateurs d'impact atteints vs cibles, utilisation des ressources, leçons apprises, perspectives." },
      { label: "Note conceptuelle projet", desc: "Soumission à appel à projets / bailleur", type: "rapport", typeDoc: "note_de_synthese", sujet: "Note conceptuelle — proposition de projet", contenu: "Contexte et justification, objectifs, bénéficiaires, approche et méthodologie, résultats attendus, cadre logique simplifié, budget indicatif." },
    ],
  },
  {
    categorie: "RH & Management", emoji: "👥",
    templates: [
      { label: "Bilan social annuel", desc: "Effectifs, rémunérations, formation, absentéisme", type: "rapport", typeDoc: "rapport_rh", sujet: "Bilan social annuel — indicateurs RH et analyse", contenu: "Effectifs (pyramide des âges, turn-over), rémunérations (masse salariale, SMIG comparé), formation (plan, coûts, taux de réalisation), absentéisme, conformité Code du travail." },
      { label: "Slides séminaire formation", desc: "Support de formation — leadership et management", type: "slides", typeDoc: "formation", sujet: "Support de formation — développement des compétences managériales", contenu: "Objectifs pédagogiques, modules de formation, exercices pratiques, études de cas contextualisés Afrique, plan d'action individuel post-formation." },
    ],
  },
  {
    categorie: "Santé Publique", emoji: "🏥",
    templates: [
      { label: "Rapport épidémiologique", desc: "Analyse d'indicateurs de santé et tendances", type: "rapport", typeDoc: "rapport_analyse", sujet: "Rapport épidémiologique — analyse des indicateurs de santé", contenu: "Analyse des indicateurs épidémiologiques (incidence, prévalence, mortalité), cartographie des zones à risque, analyse des déterminants, recommandations pour les politiques de santé publique." },
      { label: "Plan de santé district", desc: "Plan opérationnel santé pour district/région", type: "rapport", typeDoc: "plan_action", sujet: "Plan opérationnel de santé — district sanitaire", contenu: "Analyse situationnelle (données SNIS), priorités sanitaires identifiées, objectifs SMART, activités planifiées par programme, budget prévisionnel, indicateurs de suivi." },
      { label: "Slides campagne de sensibilisation", desc: "Support de communication santé communautaire", type: "slides", typeDoc: "formation", sujet: "Campagne de sensibilisation santé — support de communication", contenu: "Messages clés de prévention, comportements à adopter, ressources disponibles, appels à l'action, contacts utiles. Langage simple et accessible." },
    ],
  },
  {
    categorie: "Recherche & Académique", emoji: "🔬",
    templates: [
      { label: "Rapport de recherche", desc: "Structure IMRaD — introduction, méthodes, résultats", type: "rapport", typeDoc: "memoire_technique", sujet: "Rapport de recherche — étude scientifique", contenu: "Introduction et problématique, revue de littérature, méthodologie (design, échantillon, collecte de données), résultats et analyse, discussion, conclusion et recommandations, références bibliographiques." },
      { label: "Note de synthèse bibliographique", desc: "État de l'art sur un thème de recherche", type: "rapport", typeDoc: "note_de_synthese", sujet: "Synthèse bibliographique — état de l'art", contenu: "Recension des écrits sur le sujet, identification des courants théoriques, lacunes dans la littérature existante, cadre conceptuel proposé, orientations pour la recherche future." },
      { label: "Slides soutenance", desc: "Présentation mémoire / thèse / recherche", type: "slides", typeDoc: "memoire_technique", sujet: "Présentation de soutenance — mémoire / thèse", contenu: "Introduction et problématique, cadre théorique, méthodologie, résultats principaux, discussion, contributions, limites et perspectives. Structuré pour 20-30 minutes de présentation." },
    ],
  },
  {
    categorie: "Suivi & Évaluation", emoji: "📊",
    templates: [
      { label: "Rapport de suivi trimestriel", desc: "Avancement projet vs plan de travail et indicateurs", type: "rapport", typeDoc: "rapport_bailleur", sujet: "Rapport de suivi trimestriel — avancement du projet", contenu: "Résumé exécutif, état d'avancement des activités (réalisées vs planifiées), performance des indicateurs du cadre logique, dépenses vs budget, difficultés rencontrées et mesures correctives, planification du prochain trimestre." },
      { label: "Rapport d'évaluation finale", desc: "Évaluation d'impact — pertinence, efficacité, durabilité", type: "rapport", typeDoc: "rapport_analyse", sujet: "Évaluation finale du projet — rapport d'impact", contenu: "Contexte et objectifs de l'évaluation, méthodologie, analyse selon les critères DAC (pertinence, cohérence, efficacité, efficience, impact, durabilité), conclusions, recommandations et leçons apprises." },
      { label: "Tableau de bord S&E", desc: "Slides de performance projet pour comité de pilotage", type: "slides", typeDoc: "rapport_direction", sujet: "Tableau de bord S&E — performance du projet", contenu: "Indicateurs clés de performance vs cibles, taux de réalisation des activités, analyse des écarts, facteurs de succès et blocages, recommandations au comité de pilotage." },
    ],
  },
];

const TYPE_RAPPORT = [
  { value: "rapport_audit",     label: "Audit" },
  { value: "rapport_financier", label: "Financier" },
  { value: "rapport_bailleur",  label: "Bailleur" },
  { value: "note_juridique",    label: "Juridique" },
  { value: "memoire_technique", label: "Technique" },
];

const LANGUES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

const TYPE_DOC_ICONS: Record<string, string> = {
  rapport: "document-text-outline",
  slides:  "easel-outline",
  traduction: "language-outline",
  autre:   "document-outline",
};

export const GenerateursScreen = () => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [tab, setTab]       = useState<TabType>("rapport");
  const [openCat, setOpenCat] = useState<string | null>(null);

  // Persistance jobs — survivent à la navigation entre écrans
  const storeLoading   = useGenerateurStore((s) => s.loading);
  const storeResultats = useGenerateurStore((s) => s.resultats);
  const currentJobKey: "rapport" | "slides" | "fichiers" =
    tab === "slides" ? "slides" : tab === "rapport" ? "rapport" : "fichiers";
  const loading = storeLoading[currentJobKey];
  const result = storeResultats[currentJobKey] as { nom_fichier?: string; contenu?: string; url?: string } | null;
  const setLoading = (v: boolean) =>
    useGenerateurStore.setState((st) => ({ loading: { ...st.loading, [currentJobKey]: v } }));
  const setResult = (v: any) =>
    useGenerateurStore.getState().setResultat(currentJobKey, v);

  // Rapport fields
  const [sujetRapport, setSujetRapport]       = useState("");
  const [contexteRapport, setContexteRapport] = useState("");
  const [typeRapport, setTypeRapport]         = useState("rapport_financier");
  const [modeRapport, setModeRapport]         = useState("standard");
  const [formatRapport, setFormatRapport]     = useState("docx");

  // Slides fields
  const [sujetSlides, setSujetSlides]       = useState("");
  const [contexteSlides, setContexteSlides] = useState("");
  const [typeSlides, setTypeSlides]         = useState("rapport_direction");
  const [modeSlides, setModeSlides]         = useState("executive");

  // Traduction fields
  const [modeTrad, setModeTrad]           = useState<"texte" | "fichier">("texte");
  const [texte, setTexte]                 = useState("");
  const [fichierTrad, setFichierTrad]     = useState<{ uri: string; name: string; type: string } | null>(null);
  const [langueSource, setLangueSource]   = useState("fr");
  const [langueCible, setLangueCible]     = useState("en");

  // Depuis fichiers (onglet dédié — gardé pour compatibilité)
  const [fichiersSrc, setFichiersSrc]           = useState<Array<{ uri: string; name: string; type: string }>>([]);
  const [instructionFichiers, setInstructionFichiers] = useState("");
  const [typeSortieFichiers, setTypeSortieFichiers]   = useState("rapport_analyse");
  const [modeFichiers, setModeFichiers]               = useState("standard");

  // Fichiers intégrés dans les onglets rapport/slides
  const [fichiersRapport, setFichiersRapport] = useState<Array<{ uri: string; name: string; type: string }>>([]);
  const [fichiersSlides, setFichiersSlides]   = useState<Array<{ uri: string; name: string; type: string }>>([]);

  // Conversion de format
  const [fichierConv, setFichierConv]     = useState<{ uri: string; name: string; type: string } | null>(null);
  const [formatCible, setFormatCible]     = useState("docx");
  const loadingConv = storeLoading.conversion;
  const resultatConv = storeResultats.conversion as { fichier_converti: string; format_source: string; format_cible: string } | null;
  const setLoadingConv = (v: boolean) =>
    useGenerateurStore.setState((st) => ({ loading: { ...st.loading, conversion: v } }));
  const setResultatConv = (v: any) => useGenerateurStore.getState().setResultat("conversion", v);

  // Historique
  const [historique, setHistorique]       = useState<DocumentHistorique[]>([]);
  const [histLoading, setHistLoading]     = useState(false);

  // Infographie Pro (Bureau partagé YukpoSecrétariat)
  const navigation = useNavigation<any>();
  const [infogMode, setInfogMode]         = useState<InfogMode>("brief");
  const [infogGabarits, setInfogGabarits] = useState<GabaritInfographie[]>([]);
  const [infogPalettes, setInfogPalettes] = useState<string[]>([]);
  const [infogGabarit, setInfogGabarit]   = useState<string>("flyer_a5");
  const [infogPays, setInfogPays]         = useState<string>("CM");
  const infogLoading = storeLoading.infographie;
  const infogResult = storeResultats.infographie as ResultatInfographieReponse | null;
  const setInfogLoading = (v: boolean) =>
    useGenerateurStore.setState((st) => ({ loading: { ...st.loading, infographie: v } }));
  const setInfogResult = (v: ResultatInfographieReponse | null) =>
    useGenerateurStore.getState().setResultat("infographie", v);
  // brief mode
  const [infogBrief, setInfogBrief]       = useState("");
  // manuel mode
  const [infogTitre, setInfogTitre]         = useState("");
  const [infogSousTitre, setInfogSousTitre] = useState("");
  const [infogCorps, setInfogCorps]         = useState("");
  const [infogDetails, setInfogDetails]     = useState("");
  const [infogPalette, setInfogPalette]     = useState("classique");
  const [infogOrg, setInfogOrg]             = useState("");
  const [infogContact, setInfogContact]     = useState("");
  const [infogSlogan, setInfogSlogan]       = useState("");
  const [infogDate, setInfogDate]           = useState("");
  const [infogLieu, setInfogLieu]           = useState("");
  // modele mode
  const [infogModele, setInfogModele]       = useState<{ uri: string; name: string; type: string } | null>(null);
  // custom mode
  const [infogW, setInfogW]                 = useState(105);
  const [infogH, setInfogH]                 = useState(148);
  const [infogBleed, setInfogBleed]         = useState(3);

  const INFOG_PAYS = [
    { id: "CM", label: "Cameroun" }, { id: "CI", label: "Côte d'Ivoire" }, { id: "SN", label: "Sénégal" },
    { id: "TG", label: "Togo" }, { id: "BJ", label: "Bénin" }, { id: "BF", label: "Burkina Faso" },
    { id: "GA", label: "Gabon" }, { id: "ML", label: "Mali" }, { id: "NE", label: "Niger" },
    { id: "GN", label: "Guinée" }, { id: "CG", label: "Congo" }, { id: "CD", label: "RDC" },
    { id: "TD", label: "Tchad" },
  ];

  // ── Auto-sauvegarde ─────────────────────────────────────────────────────────

  const sauvegarderDoc = useCallback(async (
    titre: string,
    type_doc: string,
    nom_fichier?: string,
    contenu_source?: string,
    contenu_genere?: string,
  ) => {
    try {
      await generateurApi.sauvegarderDocument({
        titre: titre.slice(0, 200),
        type_doc,
        fichier: nom_fichier,
        contenu_source,
        contenu_genere,
        meta: { source: "mobile" },
      });
      chargerHistorique();
    } catch { /* non bloquant */ }
  }, []);

  // ── Historique ──────────────────────────────────────────────────────────────

  const chargerHistorique = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await generateurApi.historiqueDocuments();
      setHistorique(res.documents);
    } catch { /* ignore */ }
    finally { setHistLoading(false); }
  }, []);

  useEffect(() => { chargerHistorique(); }, [chargerHistorique]);

  // ── Générateurs ─────────────────────────────────────────────────────────────

  const ajouterFichiersPourTab = async (tab: "rapport" | "slides") => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain", "text/csv"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (picked.canceled) return;
      const nvx = picked.assets.map(a => ({ uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream" }));
      if (tab === "rapport") {
        setFichiersRapport(prev => {
          const noms = new Set(prev.map(f => f.name));
          return [...prev, ...nvx.filter(f => !noms.has(f.name))];
        });
      } else {
        setFichiersSlides(prev => {
          const noms = new Set(prev.map(f => f.name));
          return [...prev, ...nvx.filter(f => !noms.has(f.name))];
        });
      }
    } catch { Alert.alert("Erreur", "Impossible de sélectionner le fichier"); }
  };

  const genererRapport = async () => {
    if (!sujetRapport) return;
    setLoading(true); setResult(null);
    try {
      let res: any;
      if (fichiersRapport.length > 0) {
        const instruction = [sujetRapport, contexteRapport].filter(Boolean).join("\n\n");
        res = await generateurApi.analyserEtGenerer({
          instruction,
          type_sortie: "rapport",
          type_doc: typeRapport,
          mode: modeRapport,
          format_sortie: "docx",
          fichiers: fichiersRapport,
        });
      } else {
        res = await generateurApi.rapport({
          sujet: sujetRapport,
          type_rapport: typeRapport,
          mode: modeRapport,
          contexte: contexteRapport || undefined,
          format_sortie: formatRapport,
        });
      }
      const nomFichier = res.fichier || res.chemin_fichier?.split("/").pop() || res.chemin_fichier?.split("\\").pop();
      setResult({ nom_fichier: nomFichier, contenu: res.contenu_markdown });
      sauvegarderDoc(sujetRapport, "rapport", nomFichier, contexteRapport, res.contenu_markdown);
    } catch (err: any) {
      setResult({ contenu: err?.response?.data?.detail || "Erreur lors de la génération" });
    } finally { setLoading(false); }
  };

  const genererSlides = async () => {
    if (!sujetSlides) return;
    setLoading(true); setResult(null);
    try {
      let res: any;
      if (fichiersSlides.length > 0) {
        const instruction = [sujetSlides, contexteSlides].filter(Boolean).join("\n\n");
        res = await generateurApi.analyserEtGenerer({
          instruction,
          type_sortie: "slides",
          type_doc: typeSlides,
          mode: modeSlides,
          format_sortie: "pptx",
          fichiers: fichiersSlides,
        });
      } else {
        res = await generateurApi.slides({
          sujet: sujetSlides,
          type_pres: typeSlides,
          mode: modeSlides,
          contexte: contexteSlides || undefined,
          format_sortie: "pptx",
        });
      }
      const nomFichier = res.fichier || res.chemin_fichier?.split("/").pop() || res.chemin_fichier?.split("\\").pop();
      setResult({ nom_fichier: nomFichier, contenu: res.contenu_markdown });
      sauvegarderDoc(sujetSlides, "slides", nomFichier, contexteSlides, res.contenu_markdown);
    } catch (err: any) {
      setResult({ contenu: err?.response?.data?.detail || "Erreur lors de la génération" });
    } finally { setLoading(false); }
  };

  const ajouterFichiersSrc = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain", "text/csv"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (picked.canceled) return;
      const nvx = picked.assets.map(a => ({ uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream" }));
      setFichiersSrc(prev => {
        const noms = new Set(prev.map(f => f.name));
        return [...prev, ...nvx.filter(f => !noms.has(f.name))];
      });
    } catch { Alert.alert("Erreur", "Impossible de sélectionner le fichier"); }
  };

  const analyserEtGenerer = async () => {
    if (!instructionFichiers || fichiersSrc.length === 0) return;
    setLoading(true); setResult(null);
    try {
      const FORMATS_SLIDES = new Set(["rapport_direction","bilan_activite","proposition_client","pitch_projet","formation","analyse_marche"]);
      const estSlides = FORMATS_SLIDES.has(typeSortieFichiers);
      const res = await generateurApi.analyserEtGenerer({
        instruction: instructionFichiers,
        type_sortie: estSlides ? "slides" : "rapport",
        type_doc: typeSortieFichiers,
        mode: modeFichiers,
        format_sortie: estSlides ? "pptx" : "docx",
        fichiers: fichiersSrc,
      });
      const nomFichier = res.fichier || res.chemin_fichier?.split("/").pop() || res.chemin_fichier?.split("\\").pop();
      setResult({ nom_fichier: nomFichier, contenu: res.contenu_markdown });
      sauvegarderDoc(instructionFichiers.slice(0,100), typeSortieFichiers, nomFichier, instructionFichiers, res.contenu_markdown);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Erreur lors de la génération");
    } finally { setLoading(false); }
  };

  const traduireTexte = async () => {
    if (!texte) return;
    setLoading(true); setResult(null);
    try {
      const res = await generateurApi.traduire({
        contenu: texte, langue_source: langueSource, langue_cible: langueCible,
      });
      const traduit = res.texte_traduit || res.traduction || "";
      setResult({ contenu: traduit });
      sauvegarderDoc(`Traduction ${langueSource}→${langueCible}`, "traduction", undefined, texte, traduit);
    } catch (err: any) {
      setResult({ contenu: err?.response?.data?.detail || "Erreur de traduction" });
    } finally { setLoading(false); }
  };

  const choisirFichier = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain", "text/csv", "image/*"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const f = picked.assets[0];
      setFichierTrad({ uri: f.uri, name: f.name, type: f.mimeType ?? "application/octet-stream" });
    } catch {
      Alert.alert("Erreur", "Impossible de sélectionner le fichier");
    }
  };

  const traduireFichier = async () => {
    if (!fichierTrad) return;
    setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      // @ts-ignore — React Native FormData
      fd.append("fichier", { uri: fichierTrad.uri, name: fichierTrad.name, type: fichierTrad.type });
      fd.append("langue_source", langueSource);
      fd.append("langue_cible", langueCible);
      fd.append("format_sortie", "docx");
      const res = await generateurApi.traduireFichier(fd);
      // Extraire le nom du fichier traduit depuis chemin_docx
      const nomDocx = res.chemin_docx
        ? res.chemin_docx.split("/").pop() || res.chemin_docx.split("\\").pop()
        : undefined;
      setResult({ contenu: res.texte_traduit, nom_fichier: nomDocx });
      sauvegarderDoc(
        `Traduction ${fichierTrad.name} (${langueSource}→${langueCible})`,
        "traduction", nomDocx, fichierTrad.name, res.texte_traduit,
      );
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Erreur lors de la traduction du fichier");
    } finally { setLoading(false); }
  };

  const supprimerDoc = async (id: number) => {
    Alert.alert("Supprimer", "Supprimer ce document ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await generateurApi.supprimerDocument(id);
            setHistorique(prev => prev.filter(d => d.id !== id));
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const handleDownload = (nom: string) => {
    Linking.openURL(generateurApi.urlTelechargement(nom));
  };

  // ── Conversion de format ─────────────────────────────────────────────────────

  const CONVERSIONS_MAP: Record<string, { label: string; cibles: { value: string; label: string }[] }> = {
    "pdf":  { label: "PDF",        cibles: [{ value: "docx", label: "Word (DOCX)" }, { value: "pptx", label: "PowerPoint" }, { value: "txt", label: "Texte" }] },
    "docx": { label: "Word",       cibles: [{ value: "pdf",  label: "PDF" }, { value: "txt", label: "Texte" }] },
    "doc":  { label: "Word (doc)", cibles: [{ value: "docx", label: "Word DOCX" }, { value: "txt", label: "Texte" }] },
    "pptx": { label: "PowerPoint", cibles: [{ value: "docx", label: "Word" }, { value: "txt", label: "Texte" }] },
    "xlsx": { label: "Excel",      cibles: [{ value: "csv",  label: "CSV" }, { value: "docx", label: "Word" }] },
    "xls":  { label: "Excel",      cibles: [{ value: "csv",  label: "CSV" }, { value: "docx", label: "Word" }] },
    "csv":  { label: "CSV",        cibles: [{ value: "xlsx", label: "Excel" }, { value: "docx", label: "Word" }] },
    "txt":  { label: "Texte",      cibles: [{ value: "docx", label: "Word" }] },
    "jpg":  { label: "Image",      cibles: [{ value: "docx", label: "Word (OCR)" }, { value: "txt", label: "Texte (OCR)" }] },
    "jpeg": { label: "Image",      cibles: [{ value: "docx", label: "Word (OCR)" }, { value: "txt", label: "Texte (OCR)" }] },
    "png":  { label: "Image",      cibles: [{ value: "docx", label: "Word (OCR)" }, { value: "txt", label: "Texte (OCR)" }] },
  };

  const pickFichierConv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setFichierConv({ uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" });
      setResultatConv(null);
      const ext = asset.name.split(".").pop()?.toLowerCase() ?? "";
      const cibles = CONVERSIONS_MAP[ext]?.cibles ?? [];
      if (cibles.length > 0) setFormatCible(cibles[0].value);
    } catch { /* annulé */ }
  };

  const lancerConversion = async () => {
    if (!fichierConv) return;
    setLoadingConv(true); setResultatConv(null);
    try {
      const form = new FormData();
      form.append("fichier", { uri: fichierConv.uri, name: fichierConv.name, type: fichierConv.type } as any);
      form.append("format_cible", formatCible);
      const res = await generateurApi.convertirFichier(form);
      setResultatConv(res);
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "La conversion a échoué");
    } finally {
      setLoadingConv(false);
    }
  };

  const extConv = fichierConv ? (fichierConv.name.split(".").pop()?.toLowerCase() ?? "") : "";
  const ciblsConv = CONVERSIONS_MAP[extConv]?.cibles ?? [{ value: "docx", label: "Word (DOCX)" }];

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const chargerGabarits = useCallback(async () => {
    try {
      const res = await infographieApi.listerGabarits();
      setInfogGabarits(res.gabarits);
      setInfogPalettes(res.palettes);
    } catch { /* non bloquant */ }
  }, []);

  useEffect(() => { if (tab === "infographie" && infogGabarits.length === 0) chargerGabarits(); }, [tab]);

  const handleErreurCredits = (e: any) => {
    const status = e?.response?.status;
    const detail: string = e?.response?.data?.detail || "";
    if (status === 402 && detail.startsWith("CREDITS_EPUISES")) {
      const restants = /restants=(\d+)/.exec(detail)?.[1] ?? "0";
      const plan     = /plan=([^|]+)/.exec(detail)?.[1] ?? "—";
      Alert.alert(
        "💳 Crédits insuffisants",
        `Restants : ${restants} crédits (plan ${plan}). Rechargez vos crédits ou upgradez votre plan pour continuer.`,
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Recharger / Upgrader", onPress: () => navigation?.navigate?.("Abonnement") },
        ],
      );
      return true;
    }
    if (status === 403 && detail.startsWith("MODULE_NON_AUTORISE")) {
      Alert.alert(
        "🔒 Module non inclus",
        "Le module Infographie n'est pas inclus dans votre plan actuel. Passez à un plan supérieur pour y accéder.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Upgrader", onPress: () => navigation?.navigate?.("Abonnement") },
        ],
      );
      return true;
    }
    return false;
  };

  const genererInfographie = async () => {
    setInfogLoading(true); setInfogResult(null);
    try {
      let res: ResultatInfographieReponse;
      if (infogMode === "brief") {
        if (infogBrief.trim().length < 10) { Alert.alert("Brief trop court", "Décrivez votre besoin (min 10 caractères)"); setInfogLoading(false); return; }
        res = await infographieApi.genererDepuisBrief({ brief: infogBrief, type_gabarit: infogGabarit, pays: infogPays });
      } else if (infogMode === "manuel") {
        if (!infogTitre.trim()) { Alert.alert("Titre requis", "Le titre est obligatoire en mode manuel"); setInfogLoading(false); return; }
        res = await infographieApi.genererManuel({
          type_gabarit: infogGabarit,
          titre: infogTitre,
          sous_titre: infogSousTitre || undefined,
          corps: infogCorps || undefined,
          details: infogDetails.split("\n").map(s => s.trim()).filter(Boolean),
          palette: infogPalette,
          nom_organisation: infogOrg || undefined,
          contact: infogContact || undefined,
          slogan: infogSlogan || undefined,
          date_evenement: infogDate || undefined,
          lieu: infogLieu || undefined,
        });
      } else if (infogMode === "modele") {
        if (!infogModele) { Alert.alert("Modèle manquant", "Choisissez une image modèle à analyser"); setInfogLoading(false); return; }
        if (infogBrief.trim().length < 10) { Alert.alert("Brief trop court", "Décrivez votre besoin (min 10 caractères)"); setInfogLoading(false); return; }
        res = await infographieApi.genererDepuisModele({
          modele: infogModele, brief: infogBrief, type_gabarit: infogGabarit, pays: infogPays,
        });
      } else {
        if (infogBrief.trim().length < 10) { Alert.alert("Brief trop court", "Décrivez votre besoin (min 10 caractères)"); setInfogLoading(false); return; }
        if (infogW <= 0 || infogH <= 0) { Alert.alert("Dimensions invalides", "Largeur et hauteur doivent être > 0"); setInfogLoading(false); return; }
        res = await infographieApi.genererCustom({
          width_mm: infogW, height_mm: infogH, bleed_mm: infogBleed, brief: infogBrief, pays: infogPays,
        });
      }
      setInfogResult(res);
      Alert.alert("✅ Infographie générée", `Crédits débités : ${res.credits_debites ?? res.prix_gabarit_fcfa}\nSauvegardée dans Mes Documents.`);
    } catch (e: any) {
      if (!handleErreurCredits(e)) {
        Alert.alert("Erreur", e?.response?.data?.detail || "Erreur lors de la génération");
      }
    } finally { setInfogLoading(false); }
  };

  const choisirModele = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg"],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      setInfogModele({ uri: a.uri, name: a.name, type: a.mimeType || "image/png" });
    } catch { /* ignore */ }
  };

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: "rapport",      label: "Rapport",       icon: "document-text-outline" },
    { key: "slides",       label: "Slides",        icon: "easel-outline" },
    { key: "traduction",   label: "Traduction",    icon: "language-outline" },
    { key: "conversion",   label: "Conversion",    icon: "repeat-outline" },
    { key: "modeles",      label: "Modèles",       icon: "library-outline" },
    { key: "historique",   label: "Historique",    icon: "folder-open-outline" },
    { key: "infographie",  label: "Infographie",   icon: "color-palette-outline" },
  ];

  const gabaritCourant = infogGabarits.find(g => g.cle === infogGabarit);
  const gabaritsParCategorie = infogGabarits.reduce<Record<string, GabaritInfographie[]>>((acc, g) => {
    (acc[g.categorie] ||= []).push(g); return acc;
  }, {});

  // ── Render historique item ───────────────────────────────────────────────────

  const renderHistItem = ({ item }: { item: DocumentHistorique }) => {
    const dateStr = item.cree_le
      ? new Date(item.cree_le).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    return (
      <View style={styles.histItem}>
        <View style={styles.histItemIcon}>
          <Ionicons name={TYPE_DOC_ICONS[item.type_doc] as any || "document-outline"} size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.histItemTitre} numberOfLines={2}>{item.titre}</Text>
          <Text style={styles.histItemMeta}>{item.type_doc.toUpperCase()} · {dateStr}</Text>
        </View>
        <View style={styles.histActions}>
          {item.fichier && (
            <TouchableOpacity onPress={() => handleDownload(item.fichier!)} style={styles.histBtn}>
              <Ionicons name="download-outline" size={17} color={C.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => supprimerDoc(item.id)} style={styles.histBtn}>
            <Ionicons name="trash-outline" size={17} color={C.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* En-tête */}
      <View style={styles.pageHeader}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.pageTitle}>Yukpo Studio</Text>
            <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
          </View>
          <Text style={styles.pageSubtitle}>Rapports · Analyses · Présentations · Conversion</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => { setTab(t.key); setResult(null); }}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? C.primary : C.textMuted} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}{t.key === "historique" && historique.length > 0 ? ` (${historique.length})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Modèles — Accordéon ── */}
      {tab === "modeles" ? (
        <ScrollView contentContainerStyle={styles.modelesContent} showsVerticalScrollIndicator={false}>
          <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 12 }}>
            {TEMPLATES.reduce((s, c) => s + c.templates.length, 0)} modèles — appuyez sur une rubrique
          </Text>
          {TEMPLATES.map((cat) => {
            const isOpen = openCat === cat.categorie;
            const nDocx = cat.templates.filter(t => t.type === "rapport").length;
            const nPptx = cat.templates.filter(t => t.type === "slides").length;
            return (
              <View key={cat.categorie} style={{ marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: C.bgCardBorder, overflow: "hidden" }}>
                {/* En-tête accordéon */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setOpenCat(isOpen ? null : cat.categorie)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, backgroundColor: C.bgCard }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "700" }}>{cat.categorie}</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                        <Text style={{ color: C.textMuted, fontSize: 10 }}>{cat.templates.length} modèle{cat.templates.length > 1 ? "s" : ""}</Text>
                        {nDocx > 0 && <Text style={{ color: "#93C5FD", fontSize: 10, fontWeight: "600" }}>{nDocx} DOCX</Text>}
                        {nPptx > 0 && <Text style={{ color: "#C4B5FD", fontSize: 10, fontWeight: "600" }}>{nPptx} PPTX</Text>}
                      </View>
                    </View>
                  </View>
                  <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={C.textMuted} />
                </TouchableOpacity>

                {/* Grille 2 colonnes — visible uniquement si ouvert */}
                {isOpen && (
                  <View style={{ padding: 10, backgroundColor: "rgba(15,20,40,0.6)", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {cat.templates.map((tpl) => (
                      <TouchableOpacity
                        key={tpl.label}
                        style={{ width: "48%", backgroundColor: C.bgCard, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.bgCardBorder }}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (tpl.type === "rapport") {
                            setSujetRapport(tpl.sujet);
                            setTypeRapport(tpl.typeDoc);
                            setContexteRapport(tpl.contenu);
                          } else {
                            setSujetSlides(tpl.sujet);
                            setContexteSlides(tpl.contenu);
                          }
                          setTab(tpl.type);
                          setResult(null);
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ color: C.textPrimary, fontSize: 11, fontWeight: "700", flex: 1, marginRight: 4 }} numberOfLines={2}>{tpl.label}</Text>
                          <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: tpl.type === "rapport" ? "rgba(96,165,250,0.15)" : "rgba(167,139,250,0.15)" }}>
                            <Text style={{ color: tpl.type === "rapport" ? "#93C5FD" : "#C4B5FD", fontSize: 9, fontWeight: "700" }}>
                              {tpl.type === "rapport" ? "DOCX" : "PPTX"}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: C.textMuted, fontSize: 10, lineHeight: 14 }} numberOfLines={2}>{tpl.desc}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 }}>
                          <Ionicons name="arrow-forward-circle-outline" size={12} color={C.primary} />
                          <Text style={{ color: C.primary, fontSize: 10, fontWeight: "600" }}>Utiliser</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : tab === "infographie" ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Mode selector */}
          <Text style={styles.label}>Mode de création</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {([
              { id: "brief",  label: "Brief IA",       icon: "sparkles-outline" },
              { id: "manuel", label: "Spec manuelle",  icon: "create-outline" },
              { id: "modele", label: "Depuis modèle",  icon: "image-outline" },
              { id: "custom", label: "Format custom",  icon: "resize-outline" },
            ] as const).map(m => (
              <TouchableOpacity key={m.id} onPress={() => setInfogMode(m.id as InfogMode)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                  borderColor: infogMode === m.id ? "#A78BFA" : C.bgCardBorder,
                  backgroundColor: infogMode === m.id ? "rgba(167,139,250,0.18)" : C.bgCard }}>
                <Ionicons name={m.icon as any} size={14} color={infogMode === m.id ? "#A78BFA" : C.textMuted} />
                <Text style={{ color: infogMode === m.id ? "#A78BFA" : C.textMuted, fontSize: 12, fontWeight: "600" }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Gabarit selector (sauf custom) */}
          {infogMode !== "custom" && (
            <>
              <Text style={styles.label}>Gabarit {gabaritCourant && <Text style={{ color: "#A78BFA" }}>· {gabaritCourant.prix_fcfa.toLocaleString("fr-FR")} FCFA = {gabaritCourant.prix_fcfa} crédits</Text>}</Text>
              <ScrollView style={{ maxHeight: 180, borderRadius: 12, borderWidth: 1, borderColor: C.bgCardBorder, marginBottom: 12 }}>
                {Object.entries(gabaritsParCategorie).map(([cat, items]) => (
                  <View key={cat}>
                    <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.bgCard, textTransform: "uppercase" }}>{cat}</Text>
                    {items.map(g => (
                      <TouchableOpacity key={g.cle} onPress={() => setInfogGabarit(g.cle)}
                        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8,
                          backgroundColor: infogGabarit === g.cle ? "rgba(167,139,250,0.15)" : "transparent" }}>
                        <Text style={{ color: infogGabarit === g.cle ? "#A78BFA" : C.textPrimary, fontSize: 13, flex: 1 }}>{g.libelle}</Text>
                        <Text style={{ color: C.textMuted, fontSize: 11 }}>{g.prix_fcfa.toLocaleString("fr-FR")} FCFA</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Pays (sauf manuel) */}
          {infogMode !== "manuel" && (
            <>
              <Text style={styles.label}>Pays cible</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {INFOG_PAYS.map(p => (
                    <TouchableOpacity key={p.id} onPress={() => setInfogPays(p.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                        borderColor: infogPays === p.id ? "#A78BFA" : C.bgCardBorder,
                        backgroundColor: infogPays === p.id ? "rgba(167,139,250,0.18)" : C.bgCard }}>
                      <Text style={{ color: infogPays === p.id ? "#A78BFA" : C.textMuted, fontSize: 11 }}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Mode brief */}
          {infogMode === "brief" && (
            <>
              <Text style={styles.label}>Brief / Description du besoin *</Text>
              <TextInput value={infogBrief} onChangeText={setInfogBrief} style={[styles.input, styles.textarea]}
                multiline numberOfLines={5} placeholder="Ex: Flyer pour formation marketing digital à Douala le 15 mars 2026, public PME, prix 50 000 FCFA, contact +237 6XX XX XX XX"
                placeholderTextColor={C.textMuted} />
            </>
          )}

          {/* Mode manuel */}
          {infogMode === "manuel" && (
            <>
              <Text style={styles.label}>Titre *</Text>
              <TextInput value={infogTitre} onChangeText={setInfogTitre} style={styles.input} placeholder="Ex: Formation Marketing Digital" placeholderTextColor={C.textMuted} />
              <Text style={styles.label}>Sous-titre</Text>
              <TextInput value={infogSousTitre} onChangeText={setInfogSousTitre} style={styles.input} placeholder="Accroche secondaire" placeholderTextColor={C.textMuted} />
              <Text style={styles.label}>Corps / Description</Text>
              <TextInput value={infogCorps} onChangeText={setInfogCorps} style={[styles.input, styles.textarea]} multiline placeholder="Texte principal du visuel" placeholderTextColor={C.textMuted} />
              <Text style={styles.label}>Détails (un par ligne)</Text>
              <TextInput value={infogDetails} onChangeText={setInfogDetails} style={[styles.input, styles.textarea]} multiline placeholder={"Date · 15 mars 2026\nLieu · Hôtel Hilton, Douala\nPrix · 50 000 FCFA"} placeholderTextColor={C.textMuted} />
              <Text style={styles.label}>Palette</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {(infogPalettes.length ? infogPalettes : ["classique", "cameroun", "senegal", "elegance", "moderne"]).map(p => (
                    <TouchableOpacity key={p} onPress={() => setInfogPalette(p)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                        borderColor: infogPalette === p ? "#A78BFA" : C.bgCardBorder,
                        backgroundColor: infogPalette === p ? "rgba(167,139,250,0.18)" : C.bgCard }}>
                      <Text style={{ color: infogPalette === p ? "#A78BFA" : C.textMuted, fontSize: 11 }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Organisation</Text>
                  <TextInput value={infogOrg} onChangeText={setInfogOrg} style={styles.input} placeholder="Cabinet …" placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Contact</Text>
                  <TextInput value={infogContact} onChangeText={setInfogContact} style={styles.input} placeholder="+237 6XX…" placeholderTextColor={C.textMuted} />
                </View>
              </View>
              <Text style={styles.label}>Slogan</Text>
              <TextInput value={infogSlogan} onChangeText={setInfogSlogan} style={styles.input} placeholder="Phrase d'accroche" placeholderTextColor={C.textMuted} />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput value={infogDate} onChangeText={setInfogDate} style={styles.input} placeholder="15 mars 2026" placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Lieu</Text>
                  <TextInput value={infogLieu} onChangeText={setInfogLieu} style={styles.input} placeholder="Hôtel Hilton, Douala" placeholderTextColor={C.textMuted} />
                </View>
              </View>
            </>
          )}

          {/* Mode modèle */}
          {infogMode === "modele" && (
            <>
              <Text style={styles.label}>Image modèle (PNG/JPG) *</Text>
              <TouchableOpacity onPress={choisirModele}
                style={{ borderWidth: 1, borderStyle: "dashed", borderColor: C.bgCardBorder, borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="cloud-upload-outline" size={32} color={C.textMuted} />
                <Text style={{ color: infogModele ? "#A78BFA" : C.textMuted, fontSize: 12, marginTop: 6 }}>
                  {infogModele ? infogModele.name : "Choisir une image à analyser"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.label}>Brief d'adaptation *</Text>
              <TextInput value={infogBrief} onChangeText={setInfogBrief} style={[styles.input, styles.textarea]}
                multiline numberOfLines={4} placeholder="Adapte ce visuel pour ma formation X, garde le style mais change …"
                placeholderTextColor={C.textMuted} />
            </>
          )}

          {/* Mode custom */}
          {infogMode === "custom" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Largeur (mm) *</Text>
                  <TextInput value={String(infogW)} onChangeText={(v) => setInfogW(Number(v) || 0)} keyboardType="numeric" style={styles.input} placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Hauteur (mm) *</Text>
                  <TextInput value={String(infogH)} onChangeText={(v) => setInfogH(Number(v) || 0)} keyboardType="numeric" style={styles.input} placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Bleed (mm)</Text>
                  <TextInput value={String(infogBleed)} onChangeText={(v) => setInfogBleed(Number(v) || 0)} keyboardType="numeric" style={styles.input} placeholderTextColor={C.textMuted} />
                </View>
              </View>
              <Text style={styles.label}>Brief *</Text>
              <TextInput value={infogBrief} onChangeText={setInfogBrief} style={[styles.input, styles.textarea]}
                multiline numberOfLines={4} placeholder="Décrivez le visuel souhaité"
                placeholderTextColor={C.textMuted} />
            </>
          )}

          {/* Bouton générer */}
          <TouchableOpacity onPress={genererInfographie} disabled={infogLoading}
            style={{ marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
              backgroundColor: infogLoading ? C.bgCard : "#7B3FE4", opacity: infogLoading ? 0.7 : 1 }}>
            {infogLoading
              ? <><ActivityIndicator size="small" color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Génération en cours…</Text></>
              : <><Ionicons name="color-palette-outline" size={18} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Générer l'infographie</Text></>}
          </TouchableOpacity>

          {/* Résultat */}
          {infogResult && (
            <View style={{ marginTop: 20, backgroundColor: C.bgCard, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.bgCardBorder }}>
              <Text style={[styles.label, { marginBottom: 8, color: "#A78BFA" }]}>Aperçu (PNG haute qualité)</Text>
              {infogResult.png_base64 ? (
                <View style={{ aspectRatio: infogResult.width_mm / infogResult.height_mm, borderRadius: 12, overflow: "hidden", backgroundColor: C.bg, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: C.textMuted, fontSize: 11, padding: 12, textAlign: "center" }}>
                      Aperçu disponible · ouvrez le PNG depuis Mes Documents
                    </Text>
                  </View>
                </View>
              ) : null}
              <Text style={{ color: C.textSecondary, fontSize: 11, textAlign: "center", marginBottom: 8 }}>
                💳 {infogResult.credits_debites ?? infogResult.prix_gabarit_fcfa} crédits débités · {infogResult.width_mm}×{infogResult.height_mm} mm
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {infogResult.pdf_id && (
                  <TouchableOpacity onPress={() => Linking.openURL(infographieApi.urlTelechargement(infogResult.pdf_id!))}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: C.primary, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                    <Ionicons name="document-outline" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>PDF print-ready</Text>
                  </TouchableOpacity>
                )}
                {infogResult.png_id && (
                  <TouchableOpacity onPress={() => Linking.openURL(infographieApi.urlTelechargement(infogResult.png_id!))}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: C.bgCardBorder, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                    <Ionicons name="image-outline" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>PNG aperçu</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      ) : tab === "historique" ? (
        <FlatList
          data={historique}
          keyExtractor={d => d.id.toString()}
          renderItem={renderHistItem}
          contentContainerStyle={styles.histList}
          refreshControl={<RefreshControl refreshing={histLoading} onRefresh={chargerHistorique} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={styles.histEmpty}>
              <Ionicons name="folder-open-outline" size={48} color={C.textMuted} />
              <Text style={styles.histEmptyText}>Aucun document généré</Text>
              <Text style={styles.histEmptySubtext}>Vos rapports, slides et traductions apparaîtront ici</Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Rapport ── */}
          {tab === "rapport" && (
            <View style={styles.form}>
              <Text style={styles.label}>Sujet / Titre du rapport</Text>
              <TextInput
                style={styles.input}
                placeholder="Rapport annuel financier 2024..."
                placeholderTextColor={C.textMuted}
                value={sujetRapport}
                onChangeText={setSujetRapport}
              />

              <Text style={styles.label}>Type de rapport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <View style={styles.chipRowInner}>
                  {TYPE_RAPPORT.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.chip, typeRapport === t.value && styles.chipActive]}
                      onPress={() => setTypeRapport(t.value)}
                    >
                      <Text style={[styles.chipText, typeRapport === t.value && styles.chipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Mode</Text>
              <View style={styles.formatRow}>
                {[{v:"flash",l:"Flash"},{v:"standard",l:"Standard"},{v:"complet",l:"Complet"},{v:"expert",l:"Expert"}].map(({v,l}) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.formatBtn, modeRapport === v && styles.formatBtnActive]}
                    onPress={() => setModeRapport(v)}
                  >
                    <Text style={[styles.formatBtnText, modeRapport === v && styles.formatBtnTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Instructions supplémentaires (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Données clés à inclure, conclusions attendues, contexte..."
                placeholderTextColor={C.textMuted}
                value={contexteRapport}
                onChangeText={setContexteRapport}
                multiline numberOfLines={5} textAlignVertical="top"
              />

              {fichiersRapport.length === 0 && (
                <>
                  <Text style={styles.label}>Format de sortie</Text>
                  <View style={styles.formatRow}>
                    {["docx", "markdown"].map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.formatBtn, formatRapport === f && styles.formatBtnActive]}
                        onPress={() => setFormatRapport(f)}
                      >
                        <Text style={[styles.formatBtnText, formatRapport === f && styles.formatBtnTextActive]}>
                          {f.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Fichiers d'analyse */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={styles.label}>Fichiers d'analyse (optionnel)</Text>
                  <TouchableOpacity onPress={() => ajouterFichiersPourTab("rapport")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ionicons name="attach-outline" size={14} color={C.primary} />
                    <Text style={{ color: C.primary, fontSize: 12, fontWeight: "600" }}>Joindre</Text>
                  </TouchableOpacity>
                </View>
                {fichiersRapport.map((f, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4, borderWidth: 1, borderColor: C.primary + "40" }}>
                    <Ionicons name="document-outline" size={14} color={C.primary} />
                    <Text style={{ flex: 1, color: C.textSecondary, fontSize: 12 }} numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => setFichiersRapport(prev => prev.filter((_, j) => j !== i))}>
                      <Ionicons name="close-circle-outline" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                {fichiersRapport.length > 0 && (
                  <Text style={{ color: C.primary, fontSize: 11, marginTop: 2 }}>
                    ✦ Yukpo analysera ces fichiers pour enrichir le rapport
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!sujetRapport || loading) && styles.submitBtnDisabled]}
                onPress={genererRapport}
                disabled={!sujetRapport || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {fichiersRapport.length > 0 ? `Analyser et générer (${fichiersRapport.length} fichier${fichiersRapport.length > 1 ? "s" : ""})` : "Générer le rapport"}
                  </Text></>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Slides ── */}
          {tab === "slides" && (
            <View style={styles.form}>
              <Text style={styles.label}>Sujet / Titre de la présentation</Text>
              <TextInput
                style={styles.input}
                placeholder="Pitch deck — Projet X"
                placeholderTextColor={C.textMuted}
                value={sujetSlides}
                onChangeText={setSujetSlides}
              />

              <Text style={styles.label}>Type de présentation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <View style={styles.chipRowInner}>
                  {[
                    {v:"rapport_direction",l:"Direction/CA"},
                    {v:"bilan_activite",l:"Bilan activité"},
                    {v:"proposition_client",l:"Proposition client"},
                    {v:"pitch_projet",l:"Pitch projet"},
                    {v:"formation",l:"Formation"},
                    {v:"rapport_financier",l:"Financier"},
                  ].map(({v,l}) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.chip, typeSlides === v && styles.chipActive]}
                      onPress={() => setTypeSlides(v)}
                    >
                      <Text style={[styles.chipText, typeSlides === v && styles.chipTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Mode</Text>
              <View style={styles.formatRow}>
                {[{v:"executive",l:"Exécutif"},{v:"detaille",l:"Détaillé"},{v:"pitch",l:"Pitch"},{v:"expert",l:"Expert"}].map(({v,l}) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.formatBtn, modeSlides === v && styles.formatBtnActive]}
                    onPress={() => setModeSlides(v)}
                  >
                    <Text style={[styles.formatBtnText, modeSlides === v && styles.formatBtnTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Plan / Instructions (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Décrivez le sujet, les sections clés, les données à illustrer..."
                placeholderTextColor={C.textMuted}
                value={contexteSlides}
                onChangeText={setContexteSlides}
                multiline numberOfLines={5} textAlignVertical="top"
              />

              {/* Fichiers d'analyse */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={styles.label}>Fichiers d'analyse (optionnel)</Text>
                  <TouchableOpacity onPress={() => ajouterFichiersPourTab("slides")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ionicons name="attach-outline" size={14} color={C.primary} />
                    <Text style={{ color: C.primary, fontSize: 12, fontWeight: "600" }}>Joindre</Text>
                  </TouchableOpacity>
                </View>
                {fichiersSlides.map((f, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4, borderWidth: 1, borderColor: C.primary + "40" }}>
                    <Ionicons name="document-outline" size={14} color={C.primary} />
                    <Text style={{ flex: 1, color: C.textSecondary, fontSize: 12 }} numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => setFichiersSlides(prev => prev.filter((_, j) => j !== i))}>
                      <Ionicons name="close-circle-outline" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                {fichiersSlides.length > 0 && (
                  <Text style={{ color: C.primary, fontSize: 11, marginTop: 2 }}>
                    ✦ Yukpo analysera ces fichiers pour construire les slides
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!sujetSlides || loading) && styles.submitBtnDisabled]}
                onPress={genererSlides}
                disabled={!sujetSlides || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="easel-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {fichiersSlides.length > 0 ? `Analyser et générer (${fichiersSlides.length} fichier${fichiersSlides.length > 1 ? "s" : ""})` : "Générer les slides"}
                  </Text></>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Traduction ── */}
          {tab === "traduction" && (
            <View style={styles.form}>
              {/* Mode texte / fichier */}
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, modeTrad === "texte" && styles.modeBtnActive]}
                  onPress={() => setModeTrad("texte")}
                >
                  <Ionicons name="text-outline" size={15} color={modeTrad === "texte" ? C.primary : C.textMuted} />
                  <Text style={[styles.modeBtnText, modeTrad === "texte" && styles.modeBtnTextActive]}>Texte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, modeTrad === "fichier" && styles.modeBtnActive]}
                  onPress={() => setModeTrad("fichier")}
                >
                  <Ionicons name="attach-outline" size={15} color={modeTrad === "fichier" ? C.primary : C.textMuted} />
                  <Text style={[styles.modeBtnText, modeTrad === "fichier" && styles.modeBtnTextActive]}>Fichier</Text>
                </TouchableOpacity>
              </View>

              {/* Langues */}
              <View style={styles.langueRow}>
                <View style={styles.langueField}>
                  <Text style={styles.label}>Source</Text>
                  {LANGUES.map((l) => (
                    <TouchableOpacity
                      key={l.value}
                      style={[styles.langueChip, langueSource === l.value && styles.langueChipActive]}
                      onPress={() => setLangueSource(l.value)}
                    >
                      <Text style={[styles.langueChipText, langueSource === l.value && styles.langueChipTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => { const t = langueSource; setLangueSource(langueCible); setLangueCible(t); }}
                >
                  <Ionicons name="swap-horizontal" size={22} color={C.primary} />
                </TouchableOpacity>
                <View style={styles.langueField}>
                  <Text style={styles.label}>Cible</Text>
                  {LANGUES.map((l) => (
                    <TouchableOpacity
                      key={l.value}
                      style={[styles.langueChip, langueCible === l.value && styles.langueChipActive]}
                      onPress={() => setLangueCible(l.value)}
                    >
                      <Text style={[styles.langueChipText, langueCible === l.value && styles.langueChipTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Contenu : texte ou fichier */}
              {modeTrad === "texte" ? (
                <>
                  <Text style={styles.label}>Texte à traduire</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Entrez votre texte professionnel ici..."
                    placeholderTextColor={C.textMuted}
                    value={texte}
                    onChangeText={setTexte}
                    multiline numberOfLines={8} textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.submitBtn, (!texte || loading) && styles.submitBtnDisabled]}
                    onPress={traduireTexte}
                    disabled={!texte || loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <><Ionicons name="language-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Traduire</Text></>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Fichier à traduire</Text>
                  <TouchableOpacity
                    style={[styles.filePickerBtn, fichierTrad && styles.filePickerBtnActive]}
                    onPress={choisirFichier}
                  >
                    <Ionicons
                      name={fichierTrad ? "document" : "cloud-upload-outline"}
                      size={22}
                      color={fichierTrad ? C.primary : C.textMuted}
                    />
                    <Text style={[styles.filePickerText, fichierTrad && styles.filePickerTextActive]} numberOfLines={1}>
                      {fichierTrad ? fichierTrad.name : "PDF, DOCX, TXT, Excel, Image…"}
                    </Text>
                    {fichierTrad && (
                      <TouchableOpacity onPress={() => setFichierTrad(null)}>
                        <Ionicons name="close-circle" size={18} color={C.textMuted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.fileNote}>Max 20 Mo · PDF, DOCX, TXT, XLSX, PPTX, PNG, JPG</Text>
                  <TouchableOpacity
                    style={[styles.submitBtn, (!fichierTrad || loading) && styles.submitBtnDisabled]}
                    onPress={traduireFichier}
                    disabled={!fichierTrad || loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <><Ionicons name="language-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Traduire le fichier</Text></>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ── Depuis fichiers ── */}
          {tab === "fichiers" && (
            <View style={styles.form}>
              <Text style={styles.label}>Type de document à générer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <View style={styles.chipRowInner}>
                  {[
                    {v:"rapport_analyse",l:"Analyse (DOCX)"},
                    {v:"rapport_financier",l:"Financier (DOCX)"},
                    {v:"rapport_audit",l:"Audit (DOCX)"},
                    {v:"note_de_synthese",l:"Synthèse (DOCX)"},
                    {v:"rapport_direction",l:"Direction (PPTX)"},
                    {v:"pitch_projet",l:"Pitch (PPTX)"},
                  ].map(({v,l}) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.chip, typeSortieFichiers === v && styles.chipActive]}
                      onPress={() => setTypeSortieFichiers(v)}
                    >
                      <Text style={[styles.chipText, typeSortieFichiers === v && styles.chipTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Mode d'analyse</Text>
              <View style={styles.formatRow}>
                {[{v:"flash",l:"Flash"},{v:"standard",l:"Standard"},{v:"complet",l:"Complet"},{v:"expert",l:"Expert"}].map(({v,l}) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.formatBtn, modeFichiers === v && styles.formatBtnActive]}
                    onPress={() => setModeFichiers(v)}
                  >
                    <Text style={[styles.formatBtnText, modeFichiers === v && styles.formatBtnTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Instruction (ce que vous souhaitez obtenir)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Ex : Analyse financière approfondie de ces données Excel avec recommandations..."
                placeholderTextColor={C.textMuted}
                value={instructionFichiers}
                onChangeText={setInstructionFichiers}
                multiline numberOfLines={4} textAlignVertical="top"
              />

              <Text style={styles.label}>Fichiers sources ({fichiersSrc.length} sélectionné{fichiersSrc.length > 1 ? "s" : ""})</Text>
              {fichiersSrc.map((f, i) => (
                <View key={i} style={styles.fichierItem}>
                  <Ionicons name="document-outline" size={15} color={C.primary} />
                  <Text style={styles.fichierNom} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => setFichiersSrc(prev => prev.filter((_,j)=>j!==i))}>
                    <Ionicons name="close-circle" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.filePickerBtn} onPress={ajouterFichiersSrc}>
                <Ionicons name="cloud-upload-outline" size={22} color={C.textMuted} />
                <Text style={styles.filePickerText}>Ajouter des fichiers (PDF, DOCX, Excel, CSV…)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, (!instructionFichiers || fichiersSrc.length === 0 || loading) && styles.submitBtnDisabled]}
                onPress={analyserEtGenerer}
                disabled={!instructionFichiers || fichiersSrc.length === 0 || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="sparkles-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Analyser et générer</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Conversion de format ──────────────────────────────────────── */}
          {tab === "conversion" && (
            <View style={styles.form}>
              <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginBottom: 16 }}>
                Convertissez un fichier vers un autre format{"\n"}PDF→Word, Excel→CSV, Image→Word (OCR)...
              </Text>

              {/* Zone de sélection du fichier */}
              <TouchableOpacity style={styles.filePickerBtn} onPress={pickFichierConv}>
                <Ionicons name="repeat-outline" size={22} color={C.textMuted} />
                <Text style={styles.filePickerText}>
                  {fichierConv ? `✓ ${fichierConv.name}` : "Sélectionner un fichier à convertir"}
                </Text>
              </TouchableOpacity>

              {fichierConv && (
                <>
                  <Text style={styles.label}>Convertir vers</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <View style={styles.chipRowInner}>
                      {ciblsConv.map(({value, label}) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.chip, formatCible === value && styles.chipActive]}
                          onPress={() => setFormatCible(value)}
                        >
                          <Text style={[styles.chipText, formatCible === value && styles.chipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.submitBtn, loadingConv && styles.submitBtnDisabled]}
                    onPress={lancerConversion}
                    disabled={loadingConv}
                  >
                    {loadingConv
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="repeat-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Convertir</Text></>
                    }
                  </TouchableOpacity>
                </>
              )}

              {resultatConv && (
                <View style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Ionicons name="checkmark-circle" size={18} color={C.success} />
                    <Text style={styles.resultTitle}>
                      {resultatConv.format_source.replace(".", "").toUpperCase()} → {resultatConv.format_cible.replace(".", "").toUpperCase()} converti !
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(resultatConv.fichier_converti)}
                  >
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.downloadBtnText}>Télécharger {resultatConv.fichier_converti}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.newDocBtn}
                    onPress={() => { setFichierConv(null); setResultatConv(null); }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                    <Text style={styles.newDocBtnText}>Convertir un autre fichier</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Result */}
          {result && tab !== "conversion" && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={18} color={C.success} />
                <Text style={styles.resultTitle}>Résultat</Text>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => { setResult(null); setFichiersSrc([]); setInstructionFichiers(""); }}
                >
                  <Ionicons name="refresh-outline" size={15} color={C.textMuted} />
                  <Text style={styles.resetBtnText}>Nouveau</Text>
                </TouchableOpacity>
              </View>
              {result.nom_fichier && (
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => handleDownload(result.nom_fichier!)}
                >
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.downloadBtnText}>Télécharger {result.nom_fichier}</Text>
                </TouchableOpacity>
              )}
              {result.contenu && (
                <Text style={styles.resultText}>{result.contenu.slice(0, 1200)}{(result.contenu?.length ?? 0) > 1200 ? "\n…[tronqué]" : ""}</Text>
              )}
              <TouchableOpacity
                style={styles.newDocBtn}
                onPress={() => { setResult(null); setFichiersSrc([]); setInstructionFichiers(""); }}
              >
                <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                <Text style={styles.newDocBtnText}>Générer un autre document</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  // Page header
  pageHeader:     { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  pageTitle:      { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  pageSubtitle:   { color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 },
  proBadge:       { backgroundColor: "rgba(123,63,228,0.25)", borderWidth: 1, borderColor: "rgba(123,63,228,0.5)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  proBadgeText:   { color: "#A78BFA", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  // Tab bar
  tabBar:       { backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.bgCardBorder, flexGrow: 0 },
  tabBarContent:{ flexDirection: "row" },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive:        { borderBottomColor: C.primary },
  tabLabel:         { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  tabLabelActive:   { color: C.primary },
  // Form
  content:      { padding: 20, paddingBottom: 48 },
  form:         { gap: 4 },
  label:        { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15,
  },
  textarea:         { minHeight: 120, textAlignVertical: "top" },
  chipRow:          { marginBottom: 4 },
  chipRowInner:     { flexDirection: "row", gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
  },
  chipActive:       { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  chipText:         { color: C.textMuted, fontSize: 12 },
  chipTextActive:   { color: C.primary, fontWeight: "600" },
  formatRow:        { flexDirection: "row", gap: 10 },
  formatBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder, alignItems: "center",
  },
  formatBtnActive:      { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  formatBtnText:        { color: C.textMuted, fontSize: 14, fontWeight: "600" },
  formatBtnTextActive:  { color: C.primary },
  nbRow:                { flexDirection: "row", gap: 8, marginBottom: 4 },
  nbChip: {
    width: 48, height: 40, borderRadius: 10,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
    alignItems: "center", justifyContent: "center",
  },
  nbChipActive:     { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  nbChipText:       { color: C.textMuted, fontWeight: "600" },
  nbChipTextActive: { color: C.primary },
  // Traduction mode
  modeRow:          { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 4 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
  },
  modeBtnActive:    { backgroundColor: `${C.primary}20`, borderColor: C.primary },
  modeBtnText:      { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  modeBtnTextActive:{ color: C.primary },
  langueRow:        { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  langueField:      { flex: 1, gap: 6 },
  langueChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
    alignItems: "center", marginBottom: 6,
  },
  langueChipActive:     { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  langueChipText:       { color: C.textMuted, fontSize: 12 },
  langueChipTextActive: { color: C.primary, fontWeight: "600" },
  swapBtn:              { marginTop: 42, padding: 8 },
  // File picker
  filePickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
    borderStyle: "dashed",
  },
  filePickerBtnActive:    { borderColor: C.primary, borderStyle: "solid" },
  filePickerText:         { flex: 1, color: C.textMuted, fontSize: 14 },
  filePickerTextActive:   { color: C.primary, fontWeight: "600" },
  fileNote:               { color: C.textMuted, fontSize: 11, marginTop: 4 },
  // Buttons
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, marginTop: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitBtnDisabled:  { opacity: 0.4 },
  submitBtnText:      { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Result
  resultCard: {
    marginTop: 20, backgroundColor: C.bgCard, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.bgCardBorder,
  },
  resultHeader:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  resultTitle:      { color: C.success, fontSize: 14, fontWeight: "700", flex: 1 },
  resetBtn:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${C.textMuted}15` },
  resetBtnText:     { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  resultText:       { color: C.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 },
  newDocBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: C.primary, backgroundColor: `${C.primary}10`,
  },
  newDocBtnText:    { color: C.primary, fontSize: 13, fontWeight: "600" },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, marginTop: 12,
  },
  downloadBtnText:  { color: "#fff", fontWeight: "600", fontSize: 14 },
  // Modèles
  modelesContent:   { padding: 16, paddingBottom: 48 },
  modeleCat:        { marginBottom: 24 },
  modeleCatTitle: {
    color: C.textPrimary, fontSize: 14, fontWeight: "700",
    marginBottom: 10, letterSpacing: 0.3,
  },
  modeleCard: {
    backgroundColor: C.bgCard, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.bgCardBorder,
  },
  modeleCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  modeleCardTitle: { flex: 1, color: C.textPrimary, fontSize: 13, fontWeight: "700" },
  modeleTag:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  modeleTagBlue:    { backgroundColor: "rgba(59,130,246,0.15)" },
  modeleTagPurple:  { backgroundColor: "rgba(168,85,247,0.15)" },
  modeleTagText:    { fontSize: 10, fontWeight: "700" },
  modeleTagTextBlue:   { color: "#93C5FD" },
  modeleTagTextPurple: { color: "#D8B4FE" },
  modeleCardDesc: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  modeleCardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  modeleCardUse:    { color: C.primary, fontSize: 12, fontWeight: "600" },
  // Fichiers sources
  fichierItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${C.primary}15`, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
  },
  fichierNom: { flex: 1, color: C.textPrimary, fontSize: 13 },
  // Historique
  histList:         { padding: 16, gap: 0, paddingBottom: 40 },
  histItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.bgCard, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  histItemIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: `${C.primary}20`,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  histItemTitre:    { color: C.textPrimary, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  histItemMeta:     { color: C.textMuted, fontSize: 11 },
  histActions:      { flexDirection: "row", gap: 6 },
  histBtn:          { padding: 6 },
  histEmpty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 80, paddingHorizontal: 32,
  },
  histEmptyText:    { color: C.textMuted, fontSize: 16, fontWeight: "600", marginTop: 16 },
  histEmptySubtext: { color: C.textMuted, fontSize: 13, textAlign: "center", marginTop: 6 },
});
