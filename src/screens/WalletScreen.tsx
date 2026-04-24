/**
 * Wallet — solde crédits, historique, top consommateurs.
 * Raccourci abonnement intégré.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors } from "@/store";
import { abonnementApi } from "@/api/client";

type Solde = {
  plan: string;
  credits_alloues: number;
  credits_utilises: number;
  credits_restants: number;
  pct_utilise: number;
  label_plan: string;
  renouvellement_le?: string;
};
type TopModule = { module: string; credits: number; appels: number; tokens: number };
type SerieJour = { jour: string; credits: number; appels: number };
type Ligne = {
  id: number; date: string; modele: string; module: string;
  tokens_input: number; tokens_output: number; cout_fcfa: number; credits_debites: number;
};
type Data = {
  solde: Solde;
  periode_jours: number;
  totaux: { credits_consommes: number; appels: number; valeur_fcfa_payee: number };
  top_modules: TopModule[];
  serie_jour: SerieJour[];
  historique: Ligne[];
};

const PLAN_COLORS: Record<string, string> = {
  gratuit: "#64748b", starter: "#0054A6", pro: "#00B0F0", business: "#FFD700",
};
const MODULE_LABELS: Record<string, string> = {
  chat: "Chat IA", traduction: "Traduction", translate_live: "Live",
  reunion: "Réunions", rapport: "Rapports", slides: "Slides",
  document: "Documents", ocr: "OCR", audio: "Audio",
  emploi: "Emploi", marches: "Marchés", enquetes: "Enquêtes",
  forfait: "Forfait", inconnu: "Autre",
};

const PERIODES = [7, 30, 90];

export const WalletScreen = () => {
  const C = useColors();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [jours, setJours] = useState(30);

  const charger = async () => {
    setLoading(true);
    try {
      const d = await abonnementApi.wallet(jours);
      setData(d);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { charger(); }, [jours]);

  if (loading || !data) {
    return <View style={styles.center}><ActivityIndicator color={C.primary} /></View>;
  }

  const solde = data.solde;
  const pct = Math.min(100, Math.round(solde.pct_utilise));
  const pctColor = pct < 60 ? "#22c55e" : pct < 85 ? "#f59e0b" : "#ef4444";
  const planColor = PLAN_COLORS[solde.plan] || C.primary;

  const maxDay = Math.max(...data.serie_jour.map((s) => s.credits), 1);
  const maxModule = Math.max(...data.top_modules.map((m) => m.credits), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={charger} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.h1}>Mon Wallet</Text>
        <Text style={styles.muted}>Solde et consommations IA</Text>
      </View>

      {/* Hero solde */}
      <View style={[styles.hero, { borderLeftColor: planColor }]}>
        <Text style={styles.heroLabel}>SOLDE DISPONIBLE</Text>
        <Text style={[styles.heroValue, { color: planColor }]}>
          {solde.credits_restants.toLocaleString()}
        </Text>
        <Text style={styles.heroUnit}>crédits Yukpo</Text>
        <Text style={styles.heroEquiv}>
          ≈ {Math.round(solde.credits_restants * 0.6).toLocaleString()} FCFA de valeur
        </Text>

        <View style={styles.heroPlanRow}>
          <View style={[styles.planBadge, { backgroundColor: planColor + "30" }]}>
            <Text style={[styles.planBadgeText, { color: planColor }]}>{solde.plan.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroPlanLabel}>{solde.label_plan}</Text>
        </View>

        {/* Barre utilisation */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pctColor }]} />
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barText}>{solde.credits_utilises.toLocaleString()} / {solde.credits_alloues.toLocaleString()}</Text>
          <Text style={[styles.barPct, { color: pctColor }]}>{pct}%</Text>
        </View>
        {solde.renouvellement_le && (
          <Text style={styles.renew}>
            <Ionicons name="calendar-outline" size={11} /> Renouvellement : {solde.renouvellement_le}
          </Text>
        )}

        {/* Raccourcis abonnement */}
        <View style={styles.shortcuts}>
          <TouchableOpacity
            style={[styles.shortcutBtn, { backgroundColor: planColor }]}
            onPress={() => navigation.navigate("Abonnement")}
          >
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={styles.shortcutBtnText}>Gérer abonnement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shortcutBtnOutline, { borderColor: planColor }]}
            onPress={() => navigation.navigate("Abonnement")}
          >
            <Ionicons name="add-circle-outline" size={16} color={planColor} />
            <Text style={[styles.shortcutBtnOutlineText, { color: planColor }]}>Recharger</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sélecteur période */}
      <View style={styles.periods}>
        {PERIODES.map((j) => (
          <TouchableOpacity
            key={j}
            style={[styles.period, jours === j && styles.periodActive]}
            onPress={() => setJours(j)}
          >
            <Text style={[styles.periodText, jours === j && styles.periodTextActive]}>{j}j</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs période */}
      <View style={styles.kpis}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Consommés</Text>
          <Text style={styles.kpiValue}>{data.totaux.credits_consommes.toLocaleString()}</Text>
          <Text style={styles.kpiUnit}>crédits</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Appels IA</Text>
          <Text style={styles.kpiValue}>{data.totaux.appels.toLocaleString()}</Text>
          <Text style={styles.kpiUnit}>requêtes</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Valeur</Text>
          <Text style={styles.kpiValue}>{data.totaux.valeur_fcfa_payee.toLocaleString()}</Text>
          <Text style={styles.kpiUnit}>FCFA</Text>
        </View>
      </View>

      {/* Graphique quotidien */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          <Ionicons name="bar-chart-outline" size={14} /> Consommation quotidienne
        </Text>
        {data.serie_jour.length === 0 ? (
          <Text style={styles.empty}>Aucune consommation sur la période.</Text>
        ) : (
          <View style={styles.chart}>
            {data.serie_jour.slice(-20).map((s, i) => {
              const h = (s.credits / maxDay) * 100;
              return (
                <View key={i} style={styles.barWrap}>
                  <View style={[styles.bar, { height: `${Math.max(h, 3)}%`, backgroundColor: C.primary }]} />
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Top modules */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          <Ionicons name="pie-chart-outline" size={14} /> Top consommateurs
        </Text>
        {data.top_modules.length === 0 ? (
          <Text style={styles.empty}>Aucune donnée.</Text>
        ) : (
          data.top_modules.slice(0, 6).map((m) => (
            <View key={m.module} style={styles.modRow}>
              <View style={styles.modHead}>
                <Text style={styles.modLabel}>{MODULE_LABELS[m.module] || m.module}</Text>
                <Text style={styles.modMeta}>{m.credits.toLocaleString()} cr · {m.appels}</Text>
              </View>
              <View style={styles.modBarBg}>
                <View style={[styles.modBarFill, { width: `${(m.credits / maxModule) * 100}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Historique */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          <Ionicons name="time-outline" size={14} /> Historique ({data.historique.length})
        </Text>
        {data.historique.length === 0 ? (
          <Text style={styles.empty}>Aucune consommation enregistrée.</Text>
        ) : (
          data.historique.slice(0, 30).map((h) => (
            <View key={h.id} style={styles.histRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.histModule}>{MODULE_LABELS[h.module] || h.module}</Text>
                <Text style={styles.histMeta}>
                  {new Date(h.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {h.modele}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.histCredits}>{h.credits_debites.toFixed(1)} cr</Text>
                <Text style={styles.histCout}>{h.cout_fcfa.toFixed(2)} F</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  header:     { marginBottom: 16 },
  h1:         { color: C.textPrimary, fontSize: 24, fontWeight: "700" },
  muted:      { color: C.textMuted, fontSize: 12, marginTop: 2 },

  hero:       { backgroundColor: C.bgCard, borderRadius: 14, padding: 18, borderLeftWidth: 4, borderWidth: 1, borderColor: C.bgCardBorder, marginBottom: 16 },
  heroLabel:  { color: C.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  heroValue:  { fontSize: 42, fontWeight: "800", marginTop: 6 },
  heroUnit:   { color: C.textMuted, fontSize: 12 },
  heroEquiv:  { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 6 },
  heroPlanRow:{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  planBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  planBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  heroPlanLabel: { color: C.textMuted, fontSize: 12, flex: 1 },

  barBg:      { height: 8, backgroundColor: C.bgSurface, borderRadius: 4, overflow: "hidden", marginTop: 14 },
  barFill:    { height: "100%", borderRadius: 4 },
  barRow:     { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  barText:    { color: C.textMuted, fontSize: 11 },
  barPct:     { fontSize: 11, fontWeight: "700" },
  renew:      { color: C.textMuted, fontSize: 11, marginTop: 6 },

  shortcuts:  { flexDirection: "row", gap: 8, marginTop: 14 },
  shortcutBtn:{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, borderRadius: 10 },
  shortcutBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  shortcutBtnOutline: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, borderRadius: 10, borderWidth: 1.5 },
  shortcutBtnOutlineText: { fontWeight: "700", fontSize: 13 },

  periods:    { flexDirection: "row", gap: 6, marginBottom: 12 },
  period:     { flex: 1, padding: 9, borderRadius: 8, alignItems: "center", backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.bgCardBorder },
  periodActive: { backgroundColor: C.primary, borderColor: C.primary },
  periodText: { color: C.textMuted, fontWeight: "600", fontSize: 12 },
  periodTextActive: { color: "#fff" },

  kpis:       { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpi:        { flex: 1, backgroundColor: C.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.bgCardBorder },
  kpiLabel:   { color: C.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  kpiValue:   { color: C.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 4 },
  kpiUnit:    { color: C.textMuted, fontSize: 10, marginTop: 2 },

  card:       { backgroundColor: C.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.bgCardBorder },
  cardTitle:  { color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 12 },
  empty:      { color: C.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 20 },

  chart:      { flexDirection: "row", alignItems: "flex-end", height: 110, gap: 3 },
  barWrap:    { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar:        { width: "100%", borderRadius: 3 },

  modRow:     { marginBottom: 10 },
  modHead:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  modLabel:   { color: C.textPrimary, fontSize: 12, fontWeight: "600" },
  modMeta:    { color: C.textMuted, fontSize: 11 },
  modBarBg:   { height: 6, backgroundColor: C.bgSurface, borderRadius: 3, overflow: "hidden" },
  modBarFill: { height: "100%", backgroundColor: C.primary, borderRadius: 3 },

  histRow:    { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.bgCardBorder, alignItems: "center" },
  histModule: { color: C.textPrimary, fontSize: 13, fontWeight: "600" },
  histMeta:   { color: C.textMuted, fontSize: 10, marginTop: 2 },
  histCredits:{ color: C.textPrimary, fontSize: 13, fontWeight: "700" },
  histCout:   { color: C.textMuted, fontSize: 10, marginTop: 2 },
});
