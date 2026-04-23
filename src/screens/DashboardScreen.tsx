import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors, useAuthStore, useProfilStore } from "@/store";
import { profilApi, abonnementApi, emploiApi, marchesApi } from "@/api/client";

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
}

const XP_LEVELS = [
  { level: 1, name: "Starter", xp: 0 },
  { level: 2, name: "Praticien", xp: 500 },
  { level: 3, name: "Confirmé", xp: 1500 },
  { level: 4, name: "Expert", xp: 3000 },
  { level: 5, name: "Master", xp: 6000 },
];

export const DashboardScreen = ({ navigation }: any) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { user } = useAuthStore();
  const { profil, setProfil } = useProfilStore();
  const [abonnement, setAbonnement] = useState<Record<string,any> | null>(null);
  const [offresEmploi, setOffresEmploi] = useState<Array<Record<string,any>>>([]);
  const [marches, setMarches]           = useState<Array<Record<string,any>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const QUICK_ACTIONS = [
    { label: "Yukpo Pro",    desc: "Assistant & agents spécialisés", icon: "chatbubble-ellipses-outline", tab: "YukpoIA",    color: C.primary },
    { label: "Réunions",     desc: "Enregistrement & transcription", icon: "people-outline",              tab: "Reunions",   color: "#3B82F6" },
    { label: "Mon profil",   desc: "Personnaliser l'assistant",      icon: "person-outline",              tab: "Profil",     color: "#22C55E" },
    { label: "Abonnement",   desc: "Gérer mon plan",                 icon: "card-outline",                tab: "Abonnement", color: C.gold },
  ];

  const xp = (profil as any)?.xp_points || 0;
  const currentLevel = XP_LEVELS.filter((l) => l.xp <= xp).pop() || XP_LEVELS[0];
  const nextLevel = XP_LEVELS.find((l) => l.xp > xp);
  const xpProgress = nextLevel
    ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100
    : 100;

  const stats: StatCard[] = [
    { label: "Niveau",    value: currentLevel.name,                     icon: "star-outline",     color: C.gold,    sub: `${xp} XP` },
    { label: "Requêtes",  value: (profil as any)?.nombre_requetes || 0, icon: "chatbubble-outline", color: C.primary, sub: "Total" },
    { label: "Documents", value: (profil as any)?.nombre_documents || 0, icon: "document-outline",  color: C.accent,  sub: "Générés" },
    { label: "Pays",      value: (profil as any)?.pays || "—",          icon: "location-outline", color: "#22C55E", sub: (profil as any)?.metier || "" },
  ];

  const prenom = (user as any)?.prenom || (user as any)?.nom?.split(" ")[0] || "Pro";

  const loadData = async () => {
    try {
      const [p, a, e, m] = await Promise.allSettled([
        profilApi.get(),
        abonnementApi.monAbonnement(),
        emploiApi.getConfig(),
        marchesApi.getRecents(),
      ]);
      if (p.status === "fulfilled") setProfil(p.value);
      if (a.status === "fulfilled") setAbonnement(a.value);
      if (e.status === "fulfilled") setOffresEmploi((e.value.offres_emploi_recentes || []).slice(0, 3));
      if (m.status === "fulfilled") setMarches((m.value as any[]).slice(0, 4));
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {prenom} 👋</Text>
          <Text style={styles.subGreeting}>
            {(profil as any)?.metier?.replace(/_/g, " ") || "Intelligence professionnelle"}
          </Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeLevel}>Niv. {currentLevel.level}</Text>
          <Text style={styles.xpBadgeName}>{currentLevel.name}</Text>
        </View>
      </View>

      {nextLevel && (
        <View style={styles.xpBar}>
          <View style={styles.xpBarRow}>
            <Text style={styles.xpBarLabel}>{xp} XP</Text>
            <Text style={styles.xpBarLabel}>{nextLevel.xp} XP — {nextLevel.name}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%` }]} />
          </View>
        </View>
      )}

      {abonnement && (
        <View style={styles.quotaCard}>
          <View style={styles.quotaRow}>
            <Text style={styles.quotaLabel}>Plan {(abonnement.plan || "Gratuit").toUpperCase()}</Text>
            <Text style={styles.quotaValue}>
              {abonnement.requetes_utilisees || 0} / {abonnement.quota_jour === 9999 ? "∞" : abonnement.quota_jour} requêtes ce mois
            </Text>
          </View>
          <View style={styles.quotaBg}>
            <View style={[
              styles.quotaFill,
              { width: `${abonnement.quota_jour === 9999 ? 5 : Math.min(100, ((abonnement.requetes_utilisees || 0) / (abonnement.quota_jour || 1)) * 100)}%`,
                backgroundColor: ((abonnement.requetes_utilisees || 0) / (abonnement.quota_jour || 1)) > 0.85 ? C.error : C.primary }
            ]} />
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${s.color}20` }]}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            {s.sub && <Text style={styles.statSub}>{s.sub}</Text>}
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.actionCard}
            onPress={() => navigation.navigate(a.tab)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${a.color}20` }]}>
              <Ionicons name={a.icon as any} size={22} color={a.color} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Offres d'emploi matchées</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Emploi")}>
          <Text style={styles.sectionLink}>Voir tout →</Text>
        </TouchableOpacity>
      </View>
      {offresEmploi.length === 0 ? (
        <TouchableOpacity style={styles.emptyOffreCard} onPress={() => navigation.navigate("Emploi")}>
          <Ionicons name="briefcase-outline" size={28} color={C.textMuted} />
          <Text style={styles.emptyOffreText}>Configurer la veille emploi</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionsGrid}>
          {offresEmploi.map((offre: any, i: number) => {
            const score = offre.score ?? 0;
            const scoreColor = score >= 75 ? "#22C55E" : score >= 50 ? "#F59E0B" : "#EF4444";
            return (
              <TouchableOpacity
                key={i}
                style={styles.offreCard}
                onPress={() => navigation.navigate("Emploi")}
              >
                <View style={styles.offreIconWrap}>
                  <Ionicons name="briefcase-outline" size={18} color="#F59E0B" />
                </View>
                <View style={styles.offreInfo}>
                  <Text style={styles.offreTitre} numberOfLines={1}>{offre.titre}</Text>
                  <Text style={styles.offreEntreprise} numberOfLines={1}>
                    {offre.entreprise}{offre.lieu ? ` · ${offre.lieu}` : ""}
                  </Text>
                </View>
                {score > 0 && (
                  <Text style={[styles.offreScore, { color: scoreColor }]}>{score}%</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Marchés publics</Text>
        <Text style={styles.sectionSub}>Mis à jour toutes les 6h</Text>
      </View>
      {marches.length === 0 ? (
        <View style={styles.emptyOffreCard}>
          <Ionicons name="hammer-outline" size={28} color={C.textMuted} />
          <Text style={styles.emptyOffreText}>Aucun appel d'offres récent</Text>
          <Text style={[styles.emptyOffreText, { fontSize: 11 }]}>
            Yukpo surveille ARMP, dgMarket, UNGM et plateformes nationales
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8, marginBottom: 24 }}>
          {marches.map((m: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={styles.marcheCard}
              activeOpacity={0.85}
              onPress={() => m.url && require("react-native").Linking.openURL(m.url).catch(() => {})}
            >
              <View style={styles.marcheIconWrap}>
                <Ionicons name="hammer-outline" size={18} color="#60A5FA" />
              </View>
              <View style={styles.marcheInfo}>
                <Text style={styles.marcheTitre} numberOfLines={2}>{m.titre}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  {m.organisme ? (<Text style={styles.marcheOrganisme} numberOfLines={1}>{m.organisme}</Text>) : null}
                  {m.source ? (<Text style={styles.marcheSource} numberOfLines={1}>{m.source}</Text>) : null}
                </View>
              </View>
              {m.url ? (<Ionicons name="open-outline" size={14} color={C.textMuted} style={{ flexShrink: 0 }} />) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

    </ScrollView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  subGreeting: { color: C.textMuted, fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  xpBadge: {
    backgroundColor: `${C.gold}20`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${C.gold}40`,
  },
  xpBadgeLevel: { color: C.gold, fontSize: 11, fontWeight: "700" },
  xpBadgeName: { color: C.gold, fontSize: 12, fontWeight: "600" },
  xpBar: { marginBottom: 20 },
  xpBarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  xpBarLabel: { color: C.textMuted, fontSize: 11 },
  xpBarBg: { height: 6, backgroundColor: C.bgCard, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", backgroundColor: C.primary, borderRadius: 3 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: {
    width: "47%",
    backgroundColor: C.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.bgCardBorder,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { color: C.textPrimary, fontSize: 18, fontWeight: "700" },
  statLabel: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  statSub: { color: C.textSecondary, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  actionsGrid: { gap: 10, marginBottom: 24 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.bgCardBorder,
    gap: 14,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionText: { flex: 1 },
  actionLabel: { color: C.textPrimary, fontSize: 15, fontWeight: "600" },
  actionDesc: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  quotaCard: {
    backgroundColor: C.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.bgCardBorder, marginBottom: 20,
  },
  quotaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  quotaLabel: { color: C.primary, fontSize: 12, fontWeight: "700" },
  quotaValue: { color: C.textMuted, fontSize: 12 },
  quotaBg: { height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: "hidden" },
  quotaFill: { height: "100%", borderRadius: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionLink: { color: C.primary, fontSize: 12 },
  sectionSub: { color: C.textMuted, fontSize: 11 },
  offreCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.bgCardBorder,
    gap: 12,
  },
  offreIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  offreInfo: { flex: 1 },
  offreTitre: { color: C.textPrimary, fontSize: 13, fontWeight: "600" },
  offreEntreprise: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  offreScore: { fontSize: 13, fontWeight: "700", flexShrink: 0 },
  emptyOffreCard: {
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: C.bgCardBorder,
    alignItems: "center",
    gap: 8,
  },
  emptyOffreText: { color: C.textMuted, fontSize: 13, textAlign: "center" },
  marcheCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(59,130,246,0.18)",
    gap: 12,
  },
  marcheIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  marcheInfo: { flex: 1 },
  marcheTitre: { color: C.textPrimary, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  marcheOrganisme: { color: C.textMuted, fontSize: 11 },
  marcheSource: { color: "#60A5FA", fontSize: 11, opacity: 0.8 },
});
