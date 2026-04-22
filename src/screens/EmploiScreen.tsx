/**
 * EmploiScreen — Veille emploi & offres matchées par Yukpo Pro
 *
 * Fonctionnalités :
 *  - Visualisation des offres d'emploi matchées périodiquement selon le profil
 *  - Activation / désactivation de la veille automatique
 *  - Configuration du profil de recherche (description + compétences)
 *  - Fréquence de recherche paramétrable
 *  - Lancement manuel d'une recherche
 *  - Score de compatibilité par offre (badge coloré)
 *  - Lien direct vers l'offre
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Switch, RefreshControl,
  Linking, Alert, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/store";
import { emploiApi, profilApi } from "@/api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OffreEmploi {
  titre:             string;
  entreprise:        string;
  lieu?:             string;
  description?:      string;
  resume?:           string;
  url?:              string;
  source?:           string;
  source_type?:      "reel" | "simule";
  date_pub?:         string;
  date_publication?: string;
  score?:            number;
  type_contrat?:     string;
  salaire?:          string;
}

interface ConfigEmploi {
  recherche_emploi_active:    boolean;
  frequence_recherche_heures: number;
  profil_recherche_emploi:    string;
  derniere_recherche_emploi:  string | null;
  offres_emploi_recentes:     OffreEmploi[];
  metier?:    string;
  pays?:      string;
  cv_disponible?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const scoreColor = (score?: number) => {
  if (!score) return COLORS.textMuted;
  if (score >= 75) return "#10B981";   // vert
  if (score >= 50) return "#F59E0B";   // orange
  return "#EF4444";                    // rouge
};

const scoreBg = (score?: number) => {
  if (!score) return `${COLORS.textMuted}20`;
  if (score >= 75) return "#10B98120";
  if (score >= 50) return "#F59E0B20";
  return "#EF444420";
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const FREQUENCES = [
  { val: 6,  label: "6h" },
  { val: 12, label: "12h" },
  { val: 24, label: "24h" },
  { val: 48, label: "2j" },
  { val: 72, label: "3j" },
];

// ── Composant principal ───────────────────────────────────────────────────────

export const EmploiScreen = () => {
  const [config, setConfig]         = useState<ConfigEmploi | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recherche, setRecherche]   = useState(false);  // recherche manuelle en cours
  const [editModal, setEditModal]   = useState(false);
  const [profilTexte, setProfilTexte] = useState("");
  const [frequence, setFrequence]   = useState(24);
  const [saving, setSaving]         = useState(false);

  // ── Chargement ──────────────────────────────────────────────────────────────

  const charger = useCallback(async () => {
    try {
      const data = await emploiApi.getConfig();
      setConfig(data);
      setProfilTexte(data.profil_recherche_emploi || "");
      setFrequence(data.frequence_recherche_heures || 24);
    } catch {
      // Profil pas encore configuré → valeurs par défaut
      setConfig({
        recherche_emploi_active: false,
        frequence_recherche_heures: 24,
        profil_recherche_emploi: "",
        derniere_recherche_emploi: null,
        offres_emploi_recentes: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const onRefresh = () => { setRefreshing(true); charger(); };

  // ── Activer / désactiver la veille ──────────────────────────────────────────

  const toggleVeille = async (valeur: boolean) => {
    if (!config) return;
    try {
      if (valeur) {
        await emploiApi.activerVeille();
      } else {
        await emploiApi.desactiverVeille();
      }
      setConfig({ ...config, recherche_emploi_active: valeur });
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Action impossible");
    }
  };

  // ── Recherche manuelle ──────────────────────────────────────────────────────

  const lancerRecherche = async () => {
    setRecherche(true);
    try {
      const result = await emploiApi.lancerRecherche();
      await charger();
      Alert.alert(
        "Recherche terminée",
        `${result.nb_offres || 0} offre(s) trouvée(s) pour votre profil.`,
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Recherche impossible");
    } finally {
      setRecherche(false);
    }
  };

  // ── Sauvegarder le profil de recherche ──────────────────────────────────────

  const sauvegarderProfil = async () => {
    setSaving(true);
    try {
      await emploiApi.mettreAJourConfig({
        profil_recherche_emploi: profilTexte,
        frequence_recherche_heures: frequence,
      });
      await charger();
      setEditModal(false);
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Sauvegarde impossible");
    } finally {
      setSaving(false);
    }
  };

  // ── Rendu ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des offres…</Text>
      </View>
    );
  }

  const offres = config?.offres_emploi_recentes || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Veille Emploi</Text>
          <Text style={styles.subtitle}>
            Offres matchées par Yukpo Pro · {offres.length} résultat{offres.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
          <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Carte de contrôle ───────────────────────────────────────────── */}
      <View style={styles.controlCard}>
        {/* Veille on/off */}
        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <Ionicons
              name={config?.recherche_emploi_active ? "notifications" : "notifications-off-outline"}
              size={20}
              color={config?.recherche_emploi_active ? COLORS.primary : COLORS.textMuted}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.controlLabel}>Veille automatique</Text>
              <Text style={styles.controlSub}>
                {config?.recherche_emploi_active
                  ? `Toutes les ${config.frequence_recherche_heures}h`
                  : "Désactivée"}
              </Text>
            </View>
          </View>
          <Switch
            value={config?.recherche_emploi_active || false}
            onValueChange={toggleVeille}
            trackColor={{ false: COLORS.bgCardBorder, true: `${COLORS.primary}60` }}
            thumbColor={config?.recherche_emploi_active ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        {/* Dernière recherche */}
        <View style={styles.controlDivider} />
        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
            <Text style={[styles.controlSub, { marginLeft: 10 }]}>
              Dernière recherche : {formatDate(config?.derniere_recherche_emploi)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.searchBtn, recherche && styles.searchBtnDisabled]}
            onPress={lancerRecherche}
            disabled={recherche}
          >
            {recherche
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="search" size={14} color="#fff" /><Text style={styles.searchBtnText}> Chercher</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Profil actif */}
        {config?.profil_recherche_emploi ? (
          <>
            <View style={styles.controlDivider} />
            <View style={styles.profilResume}>
              <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.profilResumeText} numberOfLines={2}>
                {config.profil_recherche_emploi}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.controlDivider} />
            <TouchableOpacity style={styles.profilAlerte} onPress={() => setEditModal(true)}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.gold} />
              <Text style={styles.profilAlerteText}>
                Renseignez votre profil de recherche pour de meilleures offres
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── CV disponible ───────────────────────────────────────────────── */}
      {config?.cv_disponible && (
        <View style={styles.cvBadge}>
          <Ionicons name="document-text" size={14} color="#10B981" />
          <Text style={styles.cvBadgeText}>CV enregistré — utilisé pour le matching</Text>
        </View>
      )}

      {/* ── Liste des offres ─────────────────────────────────────────────── */}
      {offres.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
          <Text style={styles.emptySub}>
            Activez la veille ou lancez une recherche manuelle.{"\n"}
            Yukpo Pro parcourt Indeed, Emploi.cm, JobAfrica et d'autres sources.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={lancerRecherche} disabled={recherche}>
            {recherche
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.emptyBtnText}>Lancer la recherche maintenant</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Offres récentes</Text>
          {offres.map((offre, idx) => (
            <OffreCard key={idx} offre={offre} />
          ))}
        </>
      )}

      <Text style={styles.footer}>
        Sources : Indeed, Emploi.cm, JobAfrica, LinkedIn, Emploi.ci — mis à jour automatiquement
      </Text>
    </ScrollView>
  );
};

// ── Carte offre ───────────────────────────────────────────────────────────────

const OffreCard = ({ offre }: { offre: OffreEmploi }) => {
  const [expanded, setExpanded] = useState(false);
  const isSimule = offre.source_type === "simule";
  const texte    = offre.description || offre.resume || "";
  const dateAff  = offre.date_pub || offre.date_publication;

  const ouvrirLien = () => {
    if (offre.url) Linking.openURL(offre.url).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[styles.offreCard, isSimule && styles.offreCardSimule]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
    >
      {/* Badge simulation */}
      {isSimule && (
        <View style={styles.simuleBadge}>
          <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
          <Text style={styles.simuleText}>Suggestion Yukpo — sources réelles indisponibles</Text>
        </View>
      )}

      {/* En-tête offre */}
      <View style={styles.offreHeader}>
        <View style={[styles.offreIconBox, isSimule && { backgroundColor: "#F59E0B20" }]}>
          <Ionicons name="briefcase" size={20} color={isSimule ? "#F59E0B" : COLORS.primary} />
        </View>
        <View style={styles.offreMeta}>
          <Text style={styles.offreTitre} numberOfLines={expanded ? undefined : 2}>
            {offre.titre}
          </Text>
          <Text style={styles.offreEntreprise}>
            {offre.entreprise}{offre.lieu ? ` · ${offre.lieu}` : ""}
          </Text>
        </View>
        {offre.score !== undefined && !isSimule && (
          <View style={[styles.scoreBadge, { backgroundColor: scoreBg(offre.score) }]}>
            <Text style={[styles.scoreText, { color: scoreColor(offre.score) }]}>
              {offre.score}%
            </Text>
          </View>
        )}
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {offre.type_contrat && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{offre.type_contrat}</Text>
          </View>
        )}
        {offre.salaire && (
          <View style={[styles.tag, { backgroundColor: "#10B98120" }]}>
            <Text style={[styles.tagText, { color: "#10B981" }]}>{offre.salaire}</Text>
          </View>
        )}
        {offre.source && !isSimule && (
          <View style={[styles.tag, styles.tagSource]}>
            <Text style={[styles.tagText, { color: COLORS.primary }]} numberOfLines={1}>{offre.source}</Text>
          </View>
        )}
        {dateAff && (
          <Text style={styles.dateText}>{dateAff}</Text>
        )}
      </View>

      {/* Description (expandable) */}
      {expanded && texte !== "" && (
        <Text style={styles.offreDesc}>{texte}</Text>
      )}
      {expanded && isSimule && (
        <Text style={styles.simuleWarning}>
          Relancez une recherche pour obtenir de vraies offres depuis Google Jobs, Adzuna ou Jooble.
        </Text>
      )}

      {/* Actions */}
      {expanded && (
        <View style={styles.offreActions}>
          {offre.url && !isSimule && (
            <TouchableOpacity style={styles.actionBtn} onPress={ouvrirLien}>
              <Ionicons name="open-outline" size={14} color={COLORS.primary} />
              <Text style={styles.actionBtnText}>Voir l'offre</Text>
            </TouchableOpacity>
          )}
          <View style={styles.compatibiliteRow}>
            {offre.score !== undefined && !isSimule && (
              <>
                <Text style={styles.compatLabel}>Compatibilité : </Text>
                <Text style={[styles.compatValue, { color: scoreColor(offre.score) }]}>
                  {offre.score >= 75 ? "Excellente" : offre.score >= 50 ? "Bonne" : "Partielle"}
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* Chevron */}
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={16}
        color={COLORS.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

// ── Modal configuration ───────────────────────────────────────────────────────

const _EditModal = ({
  visible, onClose, profilTexte, setProfilTexte,
  frequence, setFrequence, onSave, saving,
}: {
  visible: boolean; onClose: () => void;
  profilTexte: string; setProfilTexte: (v: string) => void;
  frequence: number; setFrequence: (v: number) => void;
  onSave: () => void; saving: boolean;
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Configuration recherche</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.modalLabel}>Profil de recherche</Text>
          <Text style={styles.modalHint}>
            Décrivez le type de poste recherché, vos compétences clés, votre niveau.
            Ex : "Comptable senior 8 ans d'expérience SYSCOHADA, cherche poste DAF ou RAF,
            Douala ou Abidjan, secteur banque ou industrie."
          </Text>
          <TextInput
            style={styles.modalTextarea}
            placeholder="Décrivez le poste idéal, vos compétences, localisation préférée…"
            placeholderTextColor={COLORS.textMuted}
            value={profilTexte}
            onChangeText={setProfilTexte}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.modalLabel}>Fréquence de recherche automatique</Text>
          <View style={styles.freqRow}>
            {FREQUENCES.map((f) => (
              <TouchableOpacity
                key={f.val}
                style={[styles.freqBtn, frequence === f.val && styles.freqBtnActive]}
                onPress={() => setFrequence(f.val)}
              >
                <Text style={[styles.freqBtnText, frequence === f.val && styles.freqBtnTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Sauvegarder</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Wrapper qui rend le modal accessible depuis le parent
const EmploiScreenWrapped = () => {
  // re-export with modal hoisted — using a trick: render modal inside EmploiScreen
  return null;
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  loadingText: { color: COLORS.textMuted, marginTop: 12 },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 16, paddingTop: 8,
  },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  editBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
    alignItems: "center", justifyContent: "center",
  },

  controlCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.bgCardBorder,
    marginBottom: 12,
  },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  controlLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  controlSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  controlDivider: { height: 1, backgroundColor: COLORS.bgCardBorder, marginVertical: 12 },
  searchBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  profilResume: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  profilResumeText: { color: COLORS.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  profilAlerte: { flexDirection: "row", alignItems: "center", gap: 8 },
  profilAlerteText: { color: COLORS.gold, fontSize: 12, flex: 1 },

  cvBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#10B98115", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#10B98130",
    marginBottom: 12,
  },
  cvBadgeText: { color: "#10B981", fontSize: 12, fontWeight: "600" },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },

  sectionTitle: {
    color: COLORS.textPrimary, fontSize: 15, fontWeight: "700",
    marginBottom: 12, marginTop: 4,
  },

  emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  emptyBtn: {
    marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  offreCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.bgCardBorder,
  },
  offreCardSimule: {
    backgroundColor: "rgba(245,158,11,0.05)",
    borderColor: "rgba(245,158,11,0.25)",
  },
  simuleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    marginBottom: 10, alignSelf: "flex-start",
  },
  simuleText: { color: "#F59E0B", fontSize: 11, fontWeight: "600" },
  simuleWarning: { color: "#F59E0B", fontSize: 11, marginTop: 8, lineHeight: 16 },
  offreHeader: { flexDirection: "row", alignItems: "flex-start" },
  offreIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center", justifyContent: "center",
    marginRight: 12, flexShrink: 0,
  },
  offreMeta: { flex: 1 },
  offreTitre: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  offreEntreprise: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  scoreText: { fontSize: 12, fontWeight: "700" },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.bgCardBorder, borderRadius: 20,
  },
  tagSource: { backgroundColor: `${COLORS.primary}15` },
  tagText: { color: COLORS.textMuted, fontSize: 11 },
  dateText: { color: COLORS.textMuted, fontSize: 11, marginLeft: "auto" },

  offreDesc: {
    color: COLORS.textSecondary, fontSize: 12, lineHeight: 18,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.bgCardBorder,
  },
  offreActions: {
    flexDirection: "row", alignItems: "center", marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.bgCardBorder,
    justifyContent: "space-between",
  },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: `${COLORS.primary}15`, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  actionBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  compatibiliteRow: { flexDirection: "row", alignItems: "center" },
  compatLabel: { color: COLORS.textMuted, fontSize: 12 },
  compatValue: { fontSize: 12, fontWeight: "700" },
  chevron: { position: "absolute", bottom: 12, right: 12 },

  footer: { color: COLORS.textMuted, fontSize: 10, textAlign: "center", marginTop: 24 },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBox: {
    backgroundColor: "#0F172A", borderRadius: 24,
    padding: 20, paddingBottom: 40,
    borderTopWidth: 1, borderColor: COLORS.bgCardBorder,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "700" },
  modalLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  modalHint: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 10 },
  modalTextarea: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 12, padding: 14, color: COLORS.textPrimary, fontSize: 14,
    minHeight: 110,
  },
  freqRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  freqBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.bgCardBorder,
    alignItems: "center",
  },
  freqBtnActive: { backgroundColor: `${COLORS.primary}30`, borderColor: COLORS.primary },
  freqBtnText: { color: COLORS.textMuted, fontSize: 13 },
  freqBtnTextActive: { color: COLORS.primary, fontWeight: "600" },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

// ── Export final avec modal intégré ──────────────────────────────────────────

export const EmploiScreenFull = () => {
  const [config, setConfig]         = useState<ConfigEmploi | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recherche, setRecherche]   = useState(false);
  const [editModal, setEditModal]   = useState(false);
  const [profilTexte, setProfilTexte] = useState("");
  const [frequence, setFrequence]   = useState(24);
  const [saving, setSaving]         = useState(false);
  const [keyword, setKeyword]       = useState("");

  const charger = useCallback(async () => {
    try {
      const data = await emploiApi.getConfig();
      setConfig(data);
      setProfilTexte(data.profil_recherche_emploi || "");
      setFrequence(data.frequence_recherche_heures || 24);
    } catch {
      setConfig({ recherche_emploi_active: false, frequence_recherche_heures: 24,
        profil_recherche_emploi: "", derniere_recherche_emploi: null, offres_emploi_recentes: [] });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { charger(); }, [charger]);
  const onRefresh = () => { setRefreshing(true); charger(); };

  const toggleVeille = async (valeur: boolean) => {
    if (!config) return;
    try {
      valeur ? await emploiApi.activerVeille() : await emploiApi.desactiverVeille();
      setConfig({ ...config, recherche_emploi_active: valeur });
    } catch (e: any) { Alert.alert("Erreur", e?.response?.data?.detail || "Action impossible"); }
  };

  const lancerRecherche = async () => {
    setRecherche(true);
    try {
      const result = await emploiApi.lancerRecherche();
      await charger();
      Alert.alert("Recherche terminée", `${result.nb_offres || 0} offre(s) trouvée(s).`);
    } catch (e: any) { Alert.alert("Erreur", e?.response?.data?.detail || "Erreur"); }
    finally { setRecherche(false); }
  };

  const sauvegarderProfil = async () => {
    setSaving(true);
    try {
      await emploiApi.mettreAJourConfig({ profil_recherche_emploi: profilTexte, frequence_recherche_heures: frequence });
      await charger(); setEditModal(false);
    } catch (e: any) { Alert.alert("Erreur", e?.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };

  const offres = config?.offres_emploi_recentes || [];
  const offresFiltrees = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return offres;
    return offres.filter(o =>
      o.titre?.toLowerCase().includes(kw) ||
      o.entreprise?.toLowerCase().includes(kw) ||
      o.lieu?.toLowerCase().includes(kw) ||
      (o.description || o.resume || "").toLowerCase().includes(kw)
    );
  }, [offres, keyword]);

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Chargement…</Text>
    </View>
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Veille Emploi</Text>
            <Text style={styles.subtitle}>Offres matchées · {offres.length} résultat{offres.length !== 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.controlCard}>
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Ionicons name={config?.recherche_emploi_active ? "notifications" : "notifications-off-outline"} size={20}
                color={config?.recherche_emploi_active ? COLORS.primary : COLORS.textMuted} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.controlLabel}>Veille automatique</Text>
                <Text style={styles.controlSub}>{config?.recherche_emploi_active ? `Toutes les ${config.frequence_recherche_heures}h` : "Désactivée"}</Text>
              </View>
            </View>
            <Switch value={config?.recherche_emploi_active || false} onValueChange={toggleVeille}
              trackColor={{ false: COLORS.bgCardBorder, true: `${COLORS.primary}60` }}
              thumbColor={config?.recherche_emploi_active ? COLORS.primary : COLORS.textMuted} />
          </View>

          <View style={styles.controlDivider} />
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
              <Text style={[styles.controlSub, { marginLeft: 10 }]}>Dernière : {formatDate(config?.derniere_recherche_emploi)}</Text>
            </View>
            <TouchableOpacity style={[styles.searchBtn, recherche && styles.searchBtnDisabled]} onPress={lancerRecherche} disabled={recherche}>
              {recherche ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="search" size={14} color="#fff" /><Text style={styles.searchBtnText}> Chercher</Text></>}
            </TouchableOpacity>
          </View>

          {config?.profil_recherche_emploi ? (
            <><View style={styles.controlDivider} />
              <View style={styles.profilResume}>
                <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.profilResumeText} numberOfLines={2}>{config.profil_recherche_emploi}</Text>
              </View></>
          ) : (
            <><View style={styles.controlDivider} />
              <TouchableOpacity style={styles.profilAlerte} onPress={() => setEditModal(true)}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.gold} />
                <Text style={styles.profilAlerteText}>Renseignez votre profil pour de meilleures offres</Text>
              </TouchableOpacity></>
          )}
        </View>

        {config?.cv_disponible && (
          <View style={styles.cvBadge}>
            <Ionicons name="document-text" size={14} color="#10B981" />
            <Text style={styles.cvBadgeText}>CV enregistré — utilisé pour le matching</Text>
          </View>
        )}

        {/* ── Recherche libre ──────────────────────────────────────────── */}
        {offres.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher — titre, entreprise, lieu…"
              placeholderTextColor={COLORS.textMuted}
              value={keyword}
              onChangeText={setKeyword}
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={() => setKeyword("")}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {offres.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={52} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
            <Text style={styles.emptySub}>Activez la veille ou lancez une recherche manuelle.{"\n"}Yukpo Pro parcourt Indeed, Emploi.cm, JobAfrica et d'autres sources.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={lancerRecherche} disabled={recherche}>
              {recherche ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.emptyBtnText}>Lancer la recherche maintenant</Text>}
            </TouchableOpacity>
          </View>
        ) : offresFiltrees.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptySub}>Aucune offre ne correspond à "{keyword}".</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: "#374151" }]} onPress={() => setKeyword("")}>
              <Text style={styles.emptyBtnText}>Effacer la recherche</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {keyword ? `Résultats pour "${keyword}" (${offresFiltrees.length})` : "Offres récentes"}
            </Text>
            {offresFiltrees.map((offre, idx) => <OffreCard key={idx} offre={offre} />)}
          </>
        )}

        <Text style={styles.footer}>Sources : Indeed · Emploi.cm · JobAfrica · LinkedIn · Emploi.ci</Text>
      </ScrollView>

      <_EditModal
        visible={editModal}
        onClose={() => setEditModal(false)}
        profilTexte={profilTexte}
        setProfilTexte={setProfilTexte}
        frequence={frequence}
        setFrequence={setFrequence}
        onSave={sauvegarderProfil}
        saving={saving}
      />
    </>
  );
};

// Export par défaut = version complète avec modal
export { EmploiScreenFull as default };
