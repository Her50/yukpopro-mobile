/**
 * Admin — vue mobile pour rôle admin (synthèse plateforme).
 * Charge /pro/admin/synthese si dispo, sinon affiche placeholders.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/store";
import http from "@/api/client";

type Synthese = {
  total_users?: number;
  total_pro?: number;
  total_bureau?: number;
  revenus_mois_fcfa?: number;
  consommation_credits_mois?: number;
  signups_7j?: number;
  abonnements_actifs?: number;
};

export const AdminScreen = () => {
  const [data, setData]   = useState<Synthese | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get("/pro/admin/synthese").catch(async () => {
          const { data } = await http.get("/admin/synthese");
          return { data };
        });
        setData(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Données admin indisponibles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const KPI = ({ icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <View style={styles.kpi}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.kpiVal}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
      <Text style={styles.h1}>Admin</Text>
      <Text style={styles.muted}>Synthèse plateforme</Text>

      {error && <Text style={styles.err}>{error}</Text>}

      <KPI icon="people-outline"     label="Utilisateurs total"   value={data?.total_users ?? "—"} />
      <KPI icon="briefcase-outline"  label="Comptes Pro"          value={data?.total_pro ?? "—"} />
      <KPI icon="business-outline"   label="Comptes Bureau"       value={data?.total_bureau ?? "—"} />
      <KPI icon="cash-outline"       label="Revenus du mois (FCFA)" value={data?.revenus_mois_fcfa ?? "—"} />
      <KPI icon="flash-outline"      label="Crédits consommés (mois)" value={data?.consommation_credits_mois ?? "—"} />
      <KPI icon="trending-up-outline" label="Signups 7 jours"     value={data?.signups_7j ?? "—"} />
      <KPI icon="card-outline"       label="Abonnements actifs"   value={data?.abonnements_actifs ?? "—"} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#0B0F1A" },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0F1A" },
  h1:         { color: "#fff", fontSize: 22, fontWeight: "700" },
  muted:      { color: "#9CA3AF", fontSize: 12, marginTop: 2, marginBottom: 16 },
  err:        { color: "#F87171", marginBottom: 12 },
  kpi:        { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 10, backgroundColor: "#111827", marginVertical: 6 },
  kpiVal:     { color: "#fff", fontSize: 18, fontWeight: "700" },
  kpiLabel:   { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
});
