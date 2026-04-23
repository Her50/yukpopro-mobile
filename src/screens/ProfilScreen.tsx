import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors, useAuthStore, useProfilStore, useThemeStore } from "@/store";
import { profilApi, authApi } from "@/api/client";

const METIERS = [
  { value: "expert_comptable", label: "Expert Comptable" },
  { value: "juriste", label: "Juriste / Avocat" },
  { value: "fiscal", label: "Fiscaliste" },
  { value: "auditeur", label: "Auditeur" },
  { value: "conseiller_assurance", label: "Conseiller Assurance" },
  { value: "banquier", label: "Banquier" },
  { value: "charge_projets_ong", label: "Chargé Projets ONG" },
  { value: "responsable_microfinance", label: "Microfinance" },
  { value: "transitaire", label: "Transitaire / Douanier" },
  { value: "consultant", label: "Consultant" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "autre", label: "Autre profil" },
];

const PAYS = [
  "Cameroun", "Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso",
  "Guinée", "Congo", "Gabon", "RDC", "Bénin", "Togo", "Niger",
  "Tchad", "Madagascar", "Mauritanie", "Autre",
];

const XP_LEVELS = [
  { level: 1, name: "Starter", xp: 0 },
  { level: 2, name: "Praticien", xp: 500 },
  { level: 3, name: "Confirmé", xp: 1500 },
  { level: 4, name: "Expert", xp: 3000 },
  { level: 5, name: "Master", xp: 6000 },
];

export const ProfilScreen = () => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const { user, logout } = useAuthStore();
  const { profil, setProfil } = useProfilStore();
  const [metier, setMetier] = useState((profil as any)?.metier || "");
  const [pays, setPays] = useState((profil as any)?.pays || "");
  const [entreprise, setEntreprise] = useState((profil as any)?.entreprise || "");
  const [niveauExperience, setNiveauExperience] = useState((profil as any)?.niveau_experience || "junior");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const xp = (profil as any)?.xp_points || 0;
  const currentLevel = XP_LEVELS.filter((l) => l.xp <= xp).pop() || XP_LEVELS[0];
  const nextLevel = XP_LEVELS.find((l) => l.xp > xp);
  const xpProgress = nextLevel
    ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100
    : 100;

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const updated = await profilApi.update({ metier, pays, entreprise, niveau_experience: niveauExperience });
      setProfil(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible de sauvegarder");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter de YukpoPro ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await authApi.logout();
          logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {((user as any)?.nom || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{(user as any)?.nom || "Utilisateur"}</Text>
        <Text style={styles.userEmail}>{(user as any)?.email || ""}</Text>

        <View style={styles.xpBadge}>
          <Ionicons name="star" size={14} color={C.gold} />
          <Text style={styles.xpBadgeText}>
            Niveau {currentLevel.level} — {currentLevel.name} · {xp} XP
          </Text>
        </View>

        {nextLevel && (
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%` }]} />
            </View>
            <Text style={styles.xpBarLabel}>
              {xp} / {nextLevel.xp} XP → {nextLevel.name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(profil as any)?.nombre_requetes || 0}</Text>
          <Text style={styles.statLabel}>Requêtes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(profil as any)?.nombre_documents || 0}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{currentLevel.level}</Text>
          <Text style={styles.statLabel}>Niveau</Text>
        </View>
      </View>

      {/* Theme toggle — Apparence */}
      <Text style={styles.sectionTitle}>Apparence</Text>
      <TouchableOpacity style={styles.themeRow} onPress={toggleTheme} activeOpacity={0.7}>
        <View style={styles.themeIconWrap}>
          <Ionicons name={theme === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.themeLabel}>{theme === "dark" ? "Mode clair" : "Mode sombre"}</Text>
          <Text style={styles.themeSub}>Basculer l'apparence de l'app</Text>
        </View>
        <View style={[styles.themeSwitch, theme === "dark" && styles.themeSwitchOn]}>
          <View style={[styles.themeSwitchKnob, theme === "dark" && styles.themeSwitchKnobOn]} />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Informations professionnelles</Text>

      <Text style={styles.label}>Métier</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {METIERS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.chip, metier === m.value && styles.chipActive]}
              onPress={() => setMetier(m.value)}
            >
              <Text style={[styles.chipText, metier === m.value && styles.chipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Pays</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {PAYS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, pays === p && styles.chipActive]}
              onPress={() => setPays(p)}
            >
              <Text style={[styles.chipText, pays === p && styles.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Entreprise / Organisation</Text>
      <TextInput
        style={styles.input}
        placeholder="Cabinet, ONG, entreprise..."
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

      <TouchableOpacity
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : saved ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Sauvegardé !</Text>
          </>
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Sauvegarder les modifications</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={C.error} />
        <Text style={styles.logoutBtnText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>YukpoPro v1.0 · Intelligence Professionnelle Africaine</Text>
    </ScrollView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 48 },
  profileHeader: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: `${C.primary}30`,
    borderWidth: 2, borderColor: C.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: C.primary, fontSize: 36, fontWeight: "900" },
  userName: { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  userEmail: { color: C.textMuted, fontSize: 13, marginTop: 4 },
  xpBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: `${C.gold}20`,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: `${C.gold}40`,
  },
  xpBadgeText: { color: C.gold, fontSize: 13, fontWeight: "600" },
  xpBarContainer: { width: "100%", marginTop: 12 },
  xpBarBg: { height: 6, backgroundColor: C.bgCard, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", backgroundColor: C.primary, borderRadius: 3 },
  xpBarLabel: { color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  statsRow: {
    flexDirection: "row", backgroundColor: C.bgCard,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.bgCardBorder,
    marginBottom: 24,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  statLabel: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: C.bgCardBorder },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 16 },
  label: { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  chipActive: { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  chipText: { color: C.textMuted, fontSize: 12 },
  chipTextActive: { color: C.primary, fontWeight: "600" },
  input: {
    backgroundColor: C.bgInput,
    borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15,
  },
  niveauRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  niveauBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.bgCardBorder,
    alignItems: "center",
  },
  niveauBtnActive: { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  niveauBtnText: { color: C.textMuted, fontSize: 14 },
  niveauBtnTextActive: { color: C.primary, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14, paddingVertical: 16, marginTop: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: `${C.error}15`,
    borderRadius: 14, paddingVertical: 14, marginTop: 12,
    borderWidth: 1, borderColor: `${C.error}40`,
  },
  logoutBtnText: { color: C.error, fontWeight: "600", fontSize: 15 },
  version: { color: C.textMuted, fontSize: 11, textAlign: "center", marginTop: 32 },
  themeRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.bgCard,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.bgCardBorder,
    marginBottom: 24,
  },
  themeIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: `${C.primary}20`,
    alignItems: "center", justifyContent: "center",
  },
  themeLabel: { color: C.textPrimary, fontSize: 15, fontWeight: "600" },
  themeSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  themeSwitch: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: C.bgCardBorder,
    padding: 2, justifyContent: "center",
  },
  themeSwitchOn: { backgroundColor: C.primary },
  themeSwitchKnob: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#fff",
  },
  themeSwitchKnobOn: { transform: [{ translateX: 18 }] },
});
