import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors, useAuthStore, useProfilStore } from "@/store";
import { profilApi } from "@/api/client";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/data/countries";

const METIERS = [
  { value: "expert_comptable",      label: "Expert Comptable",    icon: "calculator-outline" },
  { value: "juriste",               label: "Juriste / Avocat",    icon: "document-text-outline" },
  { value: "fiscal",                label: "Fiscaliste",          icon: "trending-up-outline" },
  { value: "auditeur",              label: "Auditeur",            icon: "search-outline" },
  { value: "conseiller_assurance",  label: "Assurance",           icon: "shield-checkmark-outline" },
  { value: "banquier",              label: "Banquier",            icon: "card-outline" },
  { value: "charge_projets_ong",    label: "ONG / Projets",       icon: "people-outline" },
  { value: "responsable_microfinance", label: "Microfinance",     icon: "cash-outline" },
  { value: "transitaire",           label: "Douane / Transit",    icon: "boat-outline" },
  { value: "consultant",            label: "Consultant",          icon: "briefcase-outline" },
  { value: "entrepreneur",          label: "Entrepreneur",        icon: "rocket-outline" },
  { value: "autre",                 label: "Autre profil",        icon: "person-outline" },
];

export const OnboardingScreen = ({ navigation }: any) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuthStore();
  const { setProfil } = useProfilStore();
  const [metier, setMetier] = useState("");
  const [pays, setPays] = useState<Country>(DEFAULT_COUNTRY);
  const [entreprise, setEntreprise] = useState("");
  const [niveauExperience, setNiveauExperience] = useState("senior");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Recherche de pays
  const [showPaysPicker, setShowPaysPicker] = useState(false);
  const [paysSearch, setPaysSearch] = useState("");

  const filteredPays = useMemo(
    () =>
      paysSearch.trim() === ""
        ? COUNTRIES
        : COUNTRIES.filter(
            (c) =>
              c.name.toLowerCase().includes(paysSearch.toLowerCase()) ||
              c.iso2.toLowerCase().includes(paysSearch.toLowerCase())
          ),
    [paysSearch]
  );

  const handleSubmit = async () => {
    if (!metier || !pays) {
      Alert.alert("Champs requis", "Veuillez choisir votre métier et votre pays");
      return;
    }
    setLoading(true);
    try {
      const profil = await profilApi.create({
        metier,
        pays: pays.iso2,
        pays_nom: pays.name,
        entreprise,
        niveau_experience: niveauExperience,
        langue: "fr",
      });
      setProfil(profil);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible de créer le profil. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header avec vrai logo */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Configurer votre espace</Text>
          <Text style={styles.subtitle}>Étape {step}/2 — Personnalisez votre profil Yukpo</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: step === 1 ? "50%" : "100%" }]} />
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>Quel est votre métier principal ?</Text>
            <View style={styles.metierGrid}>
              {METIERS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.metierCard, metier === m.value && styles.metierCardActive]}
                  onPress={() => setMetier(m.value)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={22}
                    color={metier === m.value ? C.primary : C.textMuted}
                  />
                  <Text style={[styles.metierLabel, metier === m.value && styles.metierLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, !metier && styles.btnDisabled]}
              onPress={() => metier && setStep(2)}
              disabled={!metier}
            >
              <Text style={styles.nextBtnText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Où exercez-vous ?</Text>

            {/* Sélecteur pays avec recherche */}
            <Text style={styles.label}>Pays *</Text>
            <TouchableOpacity
              style={styles.paysSelector}
              onPress={() => { setPaysSearch(""); setShowPaysPicker(true); }}
            >
              <Text style={styles.paysFlag}>{pays.flag}</Text>
              <Text style={styles.paysName}>{pays.name}</Text>
              <Ionicons name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>

            <Text style={styles.label}>Entreprise / Organisation (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Cabinet XYZ, ONG ABC..."
              placeholderTextColor={C.textMuted}
              value={entreprise}
              onChangeText={setEntreprise}
            />

            <Text style={styles.label}>Niveau d'expérience</Text>
            <View style={styles.niveauRow}>
              {[
                { value: "junior", label: "Junior" },
                { value: "senior", label: "Senior" },
                { value: "expert", label: "Expert" },
              ].map((n) => (
                <TouchableOpacity
                  key={n.value}
                  style={[styles.niveauBtn, niveauExperience === n.value && styles.niveauBtnActive]}
                  onPress={() => setNiveauExperience(n.value)}
                >
                  <Text style={[styles.niveauBtnText, niveauExperience === n.value && styles.niveauBtnTextActive]}>
                    {n.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!pays || loading) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!pays || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Accéder à YukpoPro</Text>
                    <Ionicons name="rocket-outline" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal sélecteur de pays */}
      <Modal visible={showPaysPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setShowPaysPicker(false)}>
                <Ionicons name="close" size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Rechercher un pays..."
              placeholderTextColor={C.textMuted}
              value={paysSearch}
              onChangeText={setPaysSearch}
              autoFocus
            />
            <FlatList
              data={filteredPays}
              keyExtractor={(item) => item.iso2}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, item.iso2 === pays.iso2 && styles.countryItemActive]}
                  onPress={() => { setPays(item); setShowPaysPicker(false); }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  {item.iso2 === pays.iso2 && (
                    <Ionicons name="checkmark" size={18} color={C.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  header: { alignItems: "center", marginBottom: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    marginBottom: 12, padding: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  logoImage: { width: 54, height: 54 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: C.textMuted, fontSize: 13, textAlign: "center" },
  progressBar: {
    height: 4, backgroundColor: C.bgCardBorder, borderRadius: 2,
    marginBottom: 28, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.primary, borderRadius: 2 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: "600", marginBottom: 16 },
  metierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  metierCard: {
    width: "47%", backgroundColor: C.bgCard, borderWidth: 1,
    borderColor: C.bgCardBorder, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 8,
  },
  metierCardActive: { borderColor: C.primary, backgroundColor: `${C.primary}20` },
  metierLabel: { color: C.textSecondary, fontSize: 12, textAlign: "center" },
  metierLabelActive: { color: C.primary, fontWeight: "600" },
  label: { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  // Pays selector
  paysSelector: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  paysFlag: { fontSize: 22 },
  paysName: { flex: 1, color: C.textPrimary, fontSize: 15 },
  input: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15,
  },
  niveauRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  niveauBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.bgCardBorder, alignItems: "center",
  },
  niveauBtnActive: { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  niveauBtnText: { color: C.textMuted, fontSize: 14 },
  niveauBtnTextActive: { color: C.primary, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
  },
  backBtnText: { color: C.textSecondary, fontWeight: "600" },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  submitBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.bgCardBorder,
  },
  modalTitle: { color: C.textPrimary, fontSize: 17, fontWeight: "700" },
  modalSearch: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15, margin: 16,
  },
  countryItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  countryItemActive: { backgroundColor: `${C.primary}20` },
  countryFlag: { fontSize: 22, width: 32 },
  countryName: { flex: 1, color: C.textPrimary, fontSize: 15 },
});
