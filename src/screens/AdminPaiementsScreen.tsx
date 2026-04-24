/**
 * Admin Paiements MoMo — mobile.
 * Liste des commandes en attente/provisoires, validation manuelle, upload relevé (auto-match IA).
 * Accès réservé aux rôles admin/super_admin/yukpo_owner.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useColors, type Colors, useAuthStore } from "@/store";
import { adminPaiementsApi } from "@/api/client";

type Commande = {
  id: number;
  reference: string;
  user_id: number;
  user?: { email?: string; nom?: string };
  type: string;
  plan_ou_pack: string;
  montant_fcfa: number;
  operateur?: string;
  numero_expediteur?: string;
  tx_id?: string;
  statut: string;
  motif_rejet?: string;
  cree_le: string;
  deadline: string;
  en_retard?: boolean;
  match_source?: string;
};

export const AdminPaiementsScreen = ({ navigation }: any) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuthStore();

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (user && !["admin", "super_admin", "yukpo_owner"].includes(user.role)) {
      Alert.alert("Accès refusé", "Cette page est réservée aux administrateurs.");
      navigation?.goBack?.();
    }
  }, [user, navigation]);

  const charger = async () => {
    setLoading(true);
    try {
      const res = tab === "pending" ? await adminPaiementsApi.pending() : await adminPaiementsApi.all();
      setCommandes(res.commandes || []);
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, [tab]);

  const valider = (c: Commande) => {
    Alert.alert("Valider", `Confirmer la validation de ${c.reference} ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Valider", style: "default", onPress: async () => {
        try { await adminPaiementsApi.valider(c.id); charger(); }
        catch (e: any) { Alert.alert("Erreur", e?.response?.data?.detail || ""); }
      }},
    ]);
  };

  const rejeter = (c: Commande) => {
    Alert.prompt?.("Motif de rejet", "Min 3 caractères", async (motif?: string) => {
      if (!motif || motif.length < 3) return;
      try { await adminPaiementsApi.rejeter(c.id, motif); charger(); }
      catch (e: any) { Alert.alert("Erreur", e?.response?.data?.detail || ""); }
    }) || Alert.alert("Indisponible", "Utilisez la version web pour rejeter (motif requis).");
  };

  const uploadReleve = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/csv", "text/plain", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadLoading(true);
      const data = await adminPaiementsApi.uploadReleve(
        asset.uri,
        asset.mimeType || "application/octet-stream",
        asset.name || "releve",
      );
      setResult(data);
      Alert.alert("Relevé traité", `${data.matches?.length || 0} match(s), ${data.non_matches?.length || 0} non matché(s)`);
      charger();
    } catch (e: any) {
      Alert.alert("Erreur upload", e?.response?.data?.detail || e?.message || "");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={charger} tintColor={C.primary} />}
    >
      <Text style={styles.h1}>Paiements MoMo — Admin</Text>
      <Text style={styles.subtitle}>
        Validation manuelle + auto-match IA depuis relevé. Provisoires {'>'}3h → annulation auto.
      </Text>

      {/* Upload */}
      <TouchableOpacity style={styles.uploadBtn} onPress={uploadReleve} disabled={uploadLoading}>
        {uploadLoading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.uploadBtnText}>Upload relevé MoMo (IA auto-match)</Text>
          </>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={{ color: "#22c55e", fontWeight: "bold" }}>{result.matches?.length || 0} auto-validé(s)</Text>
          <Text style={{ color: "#fbbf24" }}>{result.non_matches?.length || 0} à vérifier</Text>
          <Text style={{ color: C.textMuted }}>{result.total_lignes || 0} ligne(s) extraites</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "pending" && styles.tabActive]} onPress={() => setTab("pending")}>
          <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>En attente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "all" && styles.tabActive]} onPress={() => setTab("all")}>
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>Toutes (90j)</Text>
        </TouchableOpacity>
      </View>

      {commandes.length === 0 && !loading && (
        <Text style={styles.empty}>Aucune commande.</Text>
      )}

      {commandes.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.ref}>{c.reference}</Text>
            <View style={[styles.badge, { backgroundColor: badgeColor(c.statut) + "30" }]}>
              <Text style={{ color: badgeColor(c.statut), fontSize: 11, fontWeight: "600" }}>{c.statut}</Text>
            </View>
          </View>

          <Text style={styles.user}>{c.user?.nom || c.user?.email || `User #${c.user_id}`}</Text>
          <Text style={styles.meta}>
            {c.type} · {c.plan_ou_pack} · {c.operateur || "—"}
          </Text>
          <View style={styles.row}>
            <Text style={styles.montant}>{c.montant_fcfa.toLocaleString()} FCFA</Text>
            <Text style={styles.tel}>Tel : {c.numero_expediteur || "—"}</Text>
          </View>
          {c.tx_id && <Text style={styles.tx}>TX: {c.tx_id}</Text>}
          <Text style={[styles.deadline, c.en_retard && { color: "#ef4444" }]}>
            Deadline : {new Date(c.deadline).toLocaleString("fr-FR")}
          </Text>
          {c.motif_rejet && <Text style={styles.motif}>Motif : {c.motif_rejet}</Text>}

          {(c.statut === "attente" || c.statut === "provisoire") && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnOk} onPress={() => valider(c)}>
                <Ionicons name="checkmark" size={16} color="#22c55e" />
                <Text style={{ color: "#22c55e", marginLeft: 4, fontWeight: "600" }}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnKo} onPress={() => rejeter(c)}>
                <Ionicons name="close" size={16} color="#ef4444" />
                <Text style={{ color: "#ef4444", marginLeft: 4, fontWeight: "600" }}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const badgeColor = (s: string) => {
  switch (s) {
    case "valide":    return "#22c55e";
    case "provisoire": return "#a855f7";
    case "rejete":    return "#ef4444";
    case "annule":    return "#64748b";
    default:          return "#94a3b8";
  }
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.background },
  h1:         { color: C.textPrimary, fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle:   { color: C.textMuted, fontSize: 12, marginBottom: 16 },
  uploadBtn:  { backgroundColor: C.primary, padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadBtnText: { color: "#fff", fontWeight: "600" },
  resultBox:  { marginTop: 12, padding: 12, backgroundColor: C.surface, borderRadius: 12, gap: 4 },
  tabs:       { flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 12 },
  tab:        { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", backgroundColor: C.surface },
  tabActive:  { backgroundColor: C.primary },
  tabText:    { color: C.textMuted, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  empty:      { color: C.textMuted, textAlign: "center", marginTop: 40 },
  card:       { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHead:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ref:        { color: C.primary, fontFamily: "monospace", fontSize: 13, fontWeight: "bold" },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  user:       { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
  meta:       { color: C.textMuted, fontSize: 12, marginTop: 2 },
  row:        { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  montant:    { color: "#fbbf24", fontWeight: "700" },
  tel:        { color: C.textSecondary, fontSize: 12 },
  tx:         { color: C.textMuted, fontSize: 11, marginTop: 4 },
  deadline:   { color: C.textMuted, fontSize: 11, marginTop: 6 },
  motif:      { color: "#ef4444", fontSize: 11, marginTop: 4 },
  actions:    { flexDirection: "row", gap: 8, marginTop: 10 },
  btnOk:      { flex: 1, padding: 8, borderRadius: 8, backgroundColor: "rgba(34,197,94,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnKo:      { flex: 1, padding: 8, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
