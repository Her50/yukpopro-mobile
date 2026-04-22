import React, { useEffect, useState } from "react";
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
import * as SecureStore from "expo-secure-store";
import { COLORS, useAuthStore, useProfilStore } from "@/store";
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
      {/* Avatar / Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {((user as any)?.nom || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{(user as any)?.nom || "Utilisateur"}</Text>
        <Text style={styles.userEmail}>{(user as any)?.email || ""}</Text>

        {/* XP Badge */}
        <View style={styles.xpBadge}>
          <Ionicons name="star" size={14} color={COLORS.gold} />
          <Text style={styles.xpBadgeText}>
            Niveau {currentLevel.level} — {currentLevel.name} · {xp} XP
          </Text>
        </View>

        {/* XP Bar */}
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

      {/* Stats */}
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

      {/* Form */}
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
        placeholderTextColor={COLORS.textMuted}
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

      {/* Save */}
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

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
        <Text style={styles.logoutBtnText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>YukpoPro v1.0 · Intelligence Professionnelle Africaine</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },
  profileHeader: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}30`,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: COLORS.primary, fontSize: 36, fontWeight: "900" },
  userName: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700" },
  userEmail: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: `${COLORS.gold}20`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.gold}40`,
  },
  xpBadgeText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  xpBarContainer: { width: "100%", marginTop: 12 },
  xpBarBg: { height: 6, backgroundColor: COLORS.bgCard, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 3 },
  xpBarLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    marginBottom: 24,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700" },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.bgCardBorder },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
  },
  chipActive: { backgroundColor: `${COLORS.primary}30`, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.primary, fontWeight: "600" },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  niveauRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  niveauBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    alignItems: "center",
  },
  niveauBtnActive: { backgroundColor: `${COLORS.primary}30`, borderColor: COLORS.primary },
  niveauBtnText: { color: COLORS.textMuted, fontSize: 14 },
  niveauBtnTextActive: { color: COLORS.primary, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: `${COLORS.error}15`,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: `${COLORS.error}40`,
  },
  logoutBtnText: { color: COLORS.error, fontWeight: "600", fontSize: 15 },
  version: { color: COLORS.textMuted, fontSize: 11, textAlign: "center", marginTop: 32 },
});
