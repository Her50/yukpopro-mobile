/**
 * EmploiScreen — Veille emploi & offres matchées par Yukpo Pro
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Switch, RefreshControl,
  Linking, Alert, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors } from "@/store";
import { emploiApi } from "@/api/client";

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

const scoreColor = (C: Colors, score?: number) => {
  if (!score) return C.textMuted;
  if (score >= 75) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
};

const scoreBg = (C: Colors, score?: number) => {
  if (!score) return `${C.textMuted}20`;
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

const OffreCard = ({ offre }: { offre: OffreEmploi }) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
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
      {isSimule && (
        <View style={styles.simuleBadge}>
          <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
          <Text style={styles.simuleText}>Suggestion Yukpo — sources réelles indisponibles</Text>
        </View>
      )}

      <View style={styles.offreHeader}>
        <View style={[styles.offreIconBox, isSimule && { backgroundColor: "#F59E0B20" }]}>
          <Ionicons name="briefcase" size={20} color={isSimule ? "#F59E0B" : C.primary} />
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
          <View style={[styles.scoreBadge, { backgroundColor: scoreBg(C, offre.score) }]}>
            <Text style={[styles.scoreText, { color: scoreColor(C, offre.score) }]}>
              {offre.score}%
            </Text>
          </View>
        )}
      </View>

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
            <Text style={[styles.tagText, { color: C.primary }]} numberOfLines={1}>{offre.source}</Text>
          </View>
        )}
        {dateAff && (
          <Text style={styles.dateText}>{dateAff}</Text>
        )}
      </View>

      {expanded && texte !== "" && (
        <Text style={styles.offreDesc}>{texte}</Text>
      )}
      {expanded && isSimule && (
        <Text style={styles.simuleWarning}>
          Relancez une recherche pour obtenir de vraies offres depuis Google Jobs, Adzuna ou Jooble.
        </Text>
      )}

      {expanded && (
        <View style={styles.offreActions}>
          {offre.url && !isSimule && (
            <TouchableOpacity style={styles.actionBtn} onPress={ouvrirLien}>
              <Ionicons name="open-outline" size={14} color={C.primary} />
              <Text style={styles.actionBtnText}>Voir l'offre</Text>
            </TouchableOpacity>
          )}
          <View style={styles.compatibiliteRow}>
            {offre.score !== undefined && !isSimule && (
              <>
                <Text style={styles.compatLabel}>Compatibilité : </Text>
                <Text style={[styles.compatValue, { color: scoreColor(C, offre.score) }]}>
                  {offre.score >= 75 ? "Excellente" : offre.score >= 50 ? "Bonne" : "Partielle"}
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={16}
        color={C.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const _EditModal = ({
  visible, onClose, profilTexte, setProfilTexte,
  frequence, setFrequence, onSave, saving,
}: {
  visible: boolean; onClose: () => void;
  profilTexte: string; setProfilTexte: (v: string) => void;
  frequence: number; setFrequence: (v: number) => void;
  onSave: () => void; saving: boolean;
}) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configuration recherche</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>Profil de recherche</Text>
            <Text style={styles.modalHint}>
              Décrivez le type de poste recherché, vos compétences clés, votre niveau.
            </Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Décrivez le poste idéal, vos compétences, localisation préférée…"
              placeholderTextColor={C.textMuted}
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
};

export const EmploiScreenFull = () => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
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
      if (valeur) await emploiApi.activerVeille();
      else await emploiApi.desactiverVeille();
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
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={styles.loadingText}>Chargement…</Text>
    </View>
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Veille Emploi</Text>
            <Text style={styles.subtitle}>Offres matchées · {offres.length} résultat{offres.length !== 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="settings-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.controlCard}>
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Ionicons name={config?.recherche_emploi_active ? "notifications" : "notifications-off-outline"} size={20}
                color={config?.recherche_emploi_active ? C.primary : C.textMuted} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.controlLabel}>Veille automatique</Text>
                <Text style={styles.controlSub}>{config?.recherche_emploi_active ? `Toutes les ${config.frequence_recherche_heures}h` : "Désactivée"}</Text>
              </View>
            </View>
            <Switch value={config?.recherche_emploi_active || false} onValueChange={toggleVeille}
              trackColor={{ false: C.bgCardBorder, true: `${C.primary}60` }}
              thumbColor={config?.recherche_emploi_active ? C.primary : C.textMuted} />
          </View>

          <View style={styles.controlDivider} />
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Ionicons name="time-outline" size={18} color={C.textMuted} />
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
                <Ionicons name="person-circle-outline" size={16} color={C.primary} />
                <Text style={styles.profilResumeText} numberOfLines={2}>{config.profil_recherche_emploi}</Text>
              </View></>
          ) : (
            <><View style={styles.controlDivider} />
              <TouchableOpacity style={styles.profilAlerte} onPress={() => setEditModal(true)}>
                <Ionicons name="alert-circle-outline" size={16} color={C.gold} />
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

        {offres.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={15} color={C.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher — titre, entreprise, lieu…"
              placeholderTextColor={C.textMuted}
              value={keyword}
              onChangeText={setKeyword}
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={() => setKeyword("")}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {offres.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={52} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
            <Text style={styles.emptySub}>Activez la veille ou lancez une recherche manuelle.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={lancerRecherche} disabled={recherche}>
              {recherche ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.emptyBtnText}>Lancer la recherche maintenant</Text>}
            </TouchableOpacity>
          </View>
        ) : offresFiltrees.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={C.textMuted} />
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

export const EmploiScreen = EmploiScreenFull;
export { EmploiScreenFull as default };

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { color: C.textMuted, marginTop: 12 },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 16, paddingTop: 8,
  },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: "800" },
  subtitle: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  editBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${C.primary}15`,
    borderWidth: 1, borderColor: `${C.primary}30`,
    alignItems: "center", justifyContent: "center",
  },

  controlCard: {
    backgroundColor: C.bgCard,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.bgCardBorder,
    marginBottom: 12,
  },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  controlLabel: { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
  controlSub: { color: C.textMuted, fontSize: 12, marginTop: 1 },
  controlDivider: { height: 1, backgroundColor: C.bgCardBorder, marginVertical: 12 },
  searchBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  profilResume: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  profilResumeText: { color: C.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  profilAlerte: { flexDirection: "row", alignItems: "center", gap: 8 },
  profilAlerteText: { color: C.gold, fontSize: 12, flex: 1 },

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
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 14 },

  sectionTitle: {
    color: C.textPrimary, fontSize: 15, fontWeight: "700",
    marginBottom: 12, marginTop: 4,
  },

  emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  emptyBtn: {
    marginTop: 24, backgroundColor: C.primary, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  offreCard: {
    backgroundColor: C.bgCard,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.bgCardBorder,
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
    backgroundColor: `${C.primary}15`,
    alignItems: "center", justifyContent: "center",
    marginRight: 12, flexShrink: 0,
  },
  offreMeta: { flex: 1 },
  offreTitre: { color: C.textPrimary, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  offreEntreprise: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  scoreText: { fontSize: 12, fontWeight: "700" },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: C.bgCardBorder, borderRadius: 20,
  },
  tagSource: { backgroundColor: `${C.primary}15` },
  tagText: { color: C.textMuted, fontSize: 11 },
  dateText: { color: C.textMuted, fontSize: 11, marginLeft: "auto" },

  offreDesc: {
    color: C.textSecondary, fontSize: 12, lineHeight: 18,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.bgCardBorder,
  },
  offreActions: {
    flexDirection: "row", alignItems: "center", marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.bgCardBorder,
    justifyContent: "space-between",
  },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: `${C.primary}15`, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  actionBtnText: { color: C.primary, fontSize: 13, fontWeight: "600" },
  compatibiliteRow: { flexDirection: "row", alignItems: "center" },
  compatLabel: { color: C.textMuted, fontSize: 12 },
  compatValue: { fontSize: 12, fontWeight: "700" },
  chevron: { position: "absolute", bottom: 12, right: 12 },

  footer: { color: C.textMuted, fontSize: 10, textAlign: "center", marginTop: 24 },

  modalOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBox: {
    backgroundColor: C.bgCard, borderRadius: 24,
    padding: 20, paddingBottom: 40,
    borderTopWidth: 1, borderColor: C.bgCardBorder,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: C.textPrimary, fontSize: 17, fontWeight: "700" },
  modalLabel: { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  modalHint: { color: C.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 10 },
  modalTextarea: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, padding: 14, color: C.textPrimary, fontSize: 14,
    minHeight: 110,
  },
  freqRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  freqBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
    alignItems: "center",
  },
  freqBtnActive: { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  freqBtnText: { color: C.textMuted, fontSize: 13 },
  freqBtnTextActive: { color: C.primary, fontWeight: "600" },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
