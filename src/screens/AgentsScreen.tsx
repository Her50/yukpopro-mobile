import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/store";
import { agentApi } from "@/api/client";

interface Agent {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  metiers: string[];
  exemples: string[];
}

const AGENTS: Agent[] = [
  {
    id: "comptable",
    label: "Comptable / Fiscaliste",
    desc: "SYSCOHADA · TVA · IS · IRPP · Clôtures",
    icon: "calculator-outline",
    color: COLORS.primary,
    metiers: ["Expert comptable", "Auditeur", "Fiscaliste"],
    exemples: [
      "Calcule l'IRPP d'un salarié avec 850 000 FCFA brut au Cameroun",
      "Quelles déclarations fiscales obligatoires pour une PME ?",
      "Passe l'écriture d'une facture de vente en SYSCOHADA",
    ],
  },
  {
    id: "drh",
    label: "DRH / Paie",
    desc: "Bulletin de paie · CNPS · Licenciement · Contrats",
    icon: "people-outline",
    color: "#EC4899",
    metiers: ["DRH", "Responsable paie", "Juriste social"],
    exemples: [
      "Calcule le bulletin de paie pour 750 000 FCFA brut, 2 enfants",
      "Indemnités de licenciement pour 8 ans d'ancienneté au Cameroun",
      "Rédige un contrat CDD pour un commercial",
    ],
  },
  {
    id: "daf",
    label: "DAF / Finance",
    desc: "Cashflow · Ratios · Investissement · Board pack",
    icon: "trending-up-outline",
    color: "#6366F1",
    metiers: ["DAF", "Directeur financier", "Contrôleur de gestion"],
    exemples: [
      "Construis un plan de trésorerie sur 12 mois",
      "Calcule le TRI et la VAN de ce projet d'investissement",
      "Génère un tableau de bord financier mensuel",
    ],
  },
  {
    id: "juriste",
    label: "Juriste / Avocat",
    desc: "OHADA · Contrats · Contentieux · Conformité",
    icon: "document-text-outline",
    color: "#8B5CF6",
    metiers: ["Juriste", "Avocat", "Notaire"],
    exemples: [
      "Rédige un contrat de bail commercial OHADA",
      "Génère une mise en demeure pour impayé — droit OHADA",
      "Procédure d'injonction de payer — délais et formes",
    ],
  },
  {
    id: "banquier",
    label: "Banquier / Finance",
    desc: "TEG · Amortissement · Scoring · COBAC · KYC",
    icon: "card-outline",
    color: "#06B6D4",
    metiers: ["Banquier", "Analyste crédit", "Risk manager"],
    exemples: [
      "Calcule le TEG d'un crédit de 10M FCFA sur 48 mois à 14%",
      "Quels ratios COBAC surveiller pour mon institution ?",
      "Score de crédit — revenus 850K FCFA, demande 5M FCFA",
    ],
  },
  {
    id: "ingenieur",
    label: "Ingénieur / Chef projet",
    desc: "CPM · Planning · Marchés publics · Normes BTP",
    icon: "construct-outline",
    color: "#F97316",
    metiers: ["Ingénieur", "Chef de projet", "Conducteur de travaux"],
    exemples: [
      "Génère un planning WBS pour un projet de construction",
      "Rédige une note technique pour un appel d'offres génie civil",
      "Génère un rapport d'avancement de chantier",
    ],
  },
  {
    id: "daa",
    label: "Data Analyst",
    desc: "Statistiques · KPIs · SQL · Python · Visualisations",
    icon: "bar-chart-outline",
    color: "#22D3EE",
    metiers: ["Data Analyst", "Data Scientist", "Statisticien"],
    exemples: [
      "Génère un script Python pour analyser ce fichier Excel",
      "Construis un tableau de bord KPIs pour une direction commerciale",
      "Détecte les anomalies dans ce jeu de données de transactions",
    ],
  },
  {
    id: "commercial",
    label: "Commercial / Entrepreneur",
    desc: "Business plan · Pricing · Pipeline · Marché",
    icon: "rocket-outline",
    color: COLORS.gold,
    metiers: ["Commercial", "Entrepreneur", "Consultant"],
    exemples: [
      "Génère un business plan complet pour ma startup",
      "Rédige une proposition commerciale pour ce prospect",
      "Quelle stratégie de pricing pour pénétrer le marché nigérian ?",
    ],
  },
  {
    id: "charge_projets_ong",
    label: "ONG / Développement",
    desc: "Logframe · Budgets bailleurs · Rapports M&E",
    icon: "globe-outline",
    color: "#22C55E",
    metiers: ["Chargé de projets ONG", "Coordinateur", "Suivi-évaluation"],
    exemples: [
      "Construis un logframe pour ce projet de développement",
      "Génère un budget prévisionnel conforme aux règles UE",
      "Rédige un rapport narratif pour un bailleur AFD",
    ],
  },
  {
    id: "responsable_microfinance",
    label: "Microfinance / SFD",
    desc: "PAR · Scoring crédit · Ratios COBAC · Produits",
    icon: "cash-outline",
    color: "#A855F7",
    metiers: ["Responsable microfinance", "Credit Officer", "Directeur SFD"],
    exemples: [
      "Calcule le PAR30 de mon portefeuille microcrédit",
      "Génère une grille de scoring pour micro-entrepreneurs",
      "Rédige un rapport de conformité COBAC trimestriel",
    ],
  },
  {
    id: "transitaire",
    label: "Transitaire / Douanier",
    desc: "TEC CEMAC/UEMOA · Incoterms · Régimes douaniers",
    icon: "boat-outline",
    color: "#64748B",
    metiers: ["Transitaire", "Douanier", "Agent transit"],
    exemples: [
      "Calcule les droits de douane sur cette marchandise au Cameroun",
      "Explique les Incoterms 2020 — CIF vs FOB",
      "Quels documents pour un dédouanement import au Togo ?",
    ],
  },
  {
    id: "cv_emploi",
    label: "CV & Emploi",
    desc: "CV · Lettre de motivation · Entretiens · Offres",
    icon: "briefcase-outline",
    color: "#0EA5E9",
    metiers: ["Candidat", "Jeune diplômé", "Professionnel en transition"],
    exemples: [
      "Rédige un CV professionnel pour un DAF avec 10 ans d'expérience",
      "Rédige une lettre de motivation pour un poste de juriste OHADA",
      "Quelles questions préparer pour un entretien de directeur commercial ?",
    ],
  },
  {
    id: "recherche_emploi",
    label: "Veille Emploi",
    desc: "Marché du travail · Candidature · Négociation salaire",
    icon: "search-outline",
    color: "#7C3AED",
    metiers: ["Candidat", "Professionnel en mobilité", "Recruteur"],
    exemples: [
      "Quels sont les salaires du marché pour un Data Analyst senior à Douala ?",
      "Comment négocier une augmentation de 30% lors d'un changement de poste ?",
      "Rédige un email de candidature spontanée pour une banque CEMAC",
    ],
  },
];

export const AgentsScreen = () => {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);

  const handleChat = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await agentApi.chat(message, { agent: selectedAgent.id });
      setResult(res.reponse || res.message || JSON.stringify(res));
    } catch (err: any) {
      setResult(err?.response?.data?.detail || "Erreur lors de la communication avec l'agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Agent Selector */}
        <TouchableOpacity
          style={styles.agentSelector}
          onPress={() => setShowAgentList(!showAgentList)}
        >
          <View style={[styles.agentSelectorIcon, { backgroundColor: `${selectedAgent.color}20` }]}>
            <Ionicons name={selectedAgent.icon as any} size={22} color={selectedAgent.color} />
          </View>
          <View style={styles.agentSelectorText}>
            <Text style={styles.agentSelectorLabel}>{selectedAgent.label}</Text>
            <Text style={styles.agentSelectorDesc}>{selectedAgent.desc}</Text>
          </View>
          <Ionicons
            name={showAgentList ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>

        {/* Agent List Dropdown */}
        {showAgentList && (
          <View style={styles.agentList}>
            {AGENTS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.agentListItem, selectedAgent.id === a.id && styles.agentListItemActive]}
                onPress={() => { setSelectedAgent(a); setShowAgentList(false); setResult(null); }}
              >
                <View style={[styles.agentListIcon, { backgroundColor: `${a.color}20` }]}>
                  <Ionicons name={a.icon as any} size={16} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.agentListLabel}>{a.label}</Text>
                  <Text style={styles.agentListDesc}>{a.desc}</Text>
                </View>
                {selectedAgent.id === a.id && (
                  <Ionicons name="checkmark-circle" size={18} color={selectedAgent.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Examples */}
        {!result && (
          <>
            <Text style={styles.sectionTitle}>Exemples de requêtes</Text>
            <View style={styles.exemplesList}>
              {selectedAgent.exemples.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={styles.exempleChip}
                  onPress={() => setMessage(e)}
                >
                  <Ionicons name="flash-outline" size={13} color={selectedAgent.color} />
                  <Text style={styles.exempleText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name={selectedAgent.icon as any} size={16} color={selectedAgent.color} />
              <Text style={[styles.resultTitle, { color: selectedAgent.color }]}>
                Réponse — {selectedAgent.label}
              </Text>
              <TouchableOpacity onPress={() => setResult(null)} style={styles.clearBtn}>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder={`Question pour ${selectedAgent.label}...`}
          placeholderTextColor={COLORS.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: selectedAgent.color }, (!message.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleChat}
          disabled={!message.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 16, gap: 14 },
  agentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    gap: 12,
  },
  agentSelectorIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  agentSelectorText: { flex: 1 },
  agentSelectorLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  agentSelectorDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  agentList: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    overflow: "hidden",
  },
  agentListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgCardBorder,
  },
  agentListItemActive: { backgroundColor: `${COLORS.primary}10` },
  agentListIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  agentListLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  agentListDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  exemplesList: { gap: 8 },
  exempleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
  },
  exempleText: { color: COLORS.textSecondary, fontSize: 13, flex: 1 },
  resultCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  resultTitle: { flex: 1, fontSize: 13, fontWeight: "700" },
  clearBtn: { padding: 2 },
  resultText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCardBorder,
    backgroundColor: COLORS.bgCard,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
