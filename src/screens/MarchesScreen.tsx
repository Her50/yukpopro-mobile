/**
 * MarchesScreen — Veille marchés publics & appels d'offres (Mobile)
 * Filtres libres : mot-clé + chips secteur + chips source
 */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Linking, Alert, ActivityIndicator, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors } from "@/store";
import { marchesApi } from "@/api/client";

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

export const MarchesScreen = () => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [marches, setMarches]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [searching, setSearching]     = useState(false);
  const [keyword, setKeyword]         = useState("");
  const [filtreSecteur, setFiltreSecteur] = useState("");
  const [filtreSource, setFiltreSource]   = useState("");

  const secteurs = useMemo(
    () => [...new Set(marches.map((m: any) => m.secteur).filter(Boolean) as string[])],
    [marches],
  );
  const sources = useMemo(
    () => [...new Set(marches.map((m: any) => m.source).filter(Boolean) as string[])],
    [marches],
  );

  const marchesFiltres = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return marches.filter((m: any) => {
      const matchKw = !kw ||
        m.titre?.toLowerCase().includes(kw) ||
        m.organisme?.toLowerCase().includes(kw) ||
        m.lieu?.toLowerCase().includes(kw) ||
        m.resume?.toLowerCase().includes(kw);
      const matchSecteur = !filtreSecteur || m.secteur === filtreSecteur;
      const matchSource  = !filtreSource  || m.source  === filtreSource;
      return matchKw && matchSecteur && matchSource;
    });
  }, [marches, keyword, filtreSecteur, filtreSource]);

  const filtresActifs = keyword || filtreSecteur || filtreSource;

  const charger = useCallback(async () => {
    try {
      const data = await marchesApi.getRecents();
      setMarches(data);
    } catch {
      setMarches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const onRefresh = () => { setRefreshing(true); charger(); };

  const lancerRecherche = async () => {
    setSearching(true);
    try {
      const nb = await marchesApi.lancerRecherche();
      await charger();
      Alert.alert("Recherche terminée", `${nb} appel(s) d'offres chargé(s).`);
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || "Recherche impossible");
    } finally {
      setSearching(false);
    }
  };

  const ouvrirURL = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert("Erreur", "Impossible d'ouvrir ce lien"));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Chargement des appels d'offres…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>Marchés Publics</Text>
          <Text style={styles.sousTitre}>
            {filtresActifs
              ? `${marchesFiltres.length} / ${marches.length} appel${marches.length !== 1 ? "s" : ""} d'offres`
              : `${marches.length} appel${marches.length !== 1 ? "s" : ""} d'offres disponible${marches.length !== 1 ? "s" : ""}`
            }
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.btnRecherche, searching && styles.btnDisabled]}
          onPress={lancerRecherche}
          disabled={searching}
          activeOpacity={0.8}
        >
          {searching
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh-outline" size={16} color="#fff" />
          }
          <Text style={styles.btnRechercheText}>
            {searching ? "Chargement…" : "Actualiser"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Titre, organisme, lieu…"
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

      {/* Chips secteur */}
      {secteurs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chipsRow}>
            <Text style={styles.chipsLabel}>Secteur :</Text>
            {secteurs.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, filtreSecteur === s && styles.chipActive]}
                onPress={() => setFiltreSecteur(filtreSecteur === s ? "" : s)}
              >
                <Text style={[styles.chipText, filtreSecteur === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Chips source */}
      {sources.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chipsRow}>
            <Text style={styles.chipsLabel}>Source :</Text>
            {sources.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, filtreSource === s && styles.chipActive]}
                onPress={() => setFiltreSource(filtreSource === s ? "" : s)}
              >
                <Text style={[styles.chipText, filtreSource === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {filtresActifs ? (
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => { setKeyword(""); setFiltreSecteur(""); setFiltreSource(""); }}
        >
          <Ionicons name="close-outline" size={14} color={C.textMuted} />
          <Text style={styles.resetBtnText}>Supprimer les filtres</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sourcesCard}>
          <Ionicons name="globe-outline" size={14} color={C.primary} />
          <Text style={styles.sourcesText}>
            Sources : dgMarket (Banque Mondiale) · UNGM (ONU) · ARMP · Plateformes nationales
          </Text>
        </View>
      )}

      {marches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="hammer-outline" size={36} color={C.textMuted} />
          <Text style={styles.emptyTitre}>Aucun appel d'offres chargé</Text>
          <Text style={styles.emptyTexte}>
            Yukpo surveille les plateformes ARMP, dgMarket (Banque Mondiale), UNGM et les marchés publics.
            Actualisez pour charger les dernières offres.
          </Text>
          <TouchableOpacity
            style={[styles.btnRecherche, { marginTop: 16 }, searching && styles.btnDisabled]}
            onPress={lancerRecherche}
            disabled={searching}
            activeOpacity={0.8}
          >
            {searching
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="flash-outline" size={16} color="#fff" />
            }
            <Text style={styles.btnRechercheText}>
              {searching ? "Chargement en cours…" : "Lancer une recherche maintenant"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : marchesFiltres.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="filter-outline" size={36} color={C.textMuted} />
          <Text style={styles.emptyTitre}>Aucun résultat pour ces filtres</Text>
          <TouchableOpacity
            style={[styles.btnRecherche, { marginTop: 16, backgroundColor: "#374151" }]}
            onPress={() => { setKeyword(""); setFiltreSecteur(""); setFiltreSource(""); }}
          >
            <Ionicons name="close-outline" size={16} color="#fff" />
            <Text style={styles.btnRechercheText}>Supprimer les filtres</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {marchesFiltres.map((m: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={styles.marcheCard}
              activeOpacity={0.85}
              onPress={() => ouvrirURL(m.url)}
            >
              <View style={styles.marcheIconWrap}>
                <Ionicons name="hammer-outline" size={20} color="#60A5FA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.marcheTitre} numberOfLines={2}>{m.titre}</Text>
                <View style={styles.marcheMeta}>
                  {m.organisme ? (
                    <Text style={styles.marcheOrg} numberOfLines={1}>🏢 {m.organisme}</Text>
                  ) : null}
                  {m.lieu ? (
                    <Text style={styles.marcheLieu} numberOfLines={1}>📍 {m.lieu}</Text>
                  ) : null}
                </View>
                <View style={styles.marcheTags}>
                  {m.source ? (
                    <TouchableOpacity
                      style={[styles.tag, filtreSource === m.source && styles.tagActive]}
                      onPress={() => setFiltreSource(filtreSource === m.source ? "" : m.source)}
                    >
                      <Text style={[styles.tagText, filtreSource === m.source && { color: "#93C5FD" }]}>{m.source}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {m.secteur ? (
                    <TouchableOpacity
                      style={[styles.tag, { backgroundColor: "#1e293b" }, filtreSecteur === m.secteur && styles.tagActive]}
                      onPress={() => setFiltreSecteur(filtreSecteur === m.secteur ? "" : m.secteur)}
                    >
                      <Text style={[styles.tagText, filtreSecteur === m.secteur && { color: "#93C5FD" }]}>{m.secteur}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {m.date_pub ? (
                    <Text style={styles.marcheDate}>{formatDate(m.date_pub)}</Text>
                  ) : null}
                </View>
                {m.resume ? (
                  <Text style={styles.marcheResume} numberOfLines={2}>{m.resume}</Text>
                ) : null}
              </View>
              {m.url ? (
                <Ionicons name="open-outline" size={16} color={C.textMuted} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  content:     { padding: 16, paddingBottom: 80 },
  centered:    { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: C.bg },
  loadingText: { color: C.textMuted, fontSize: 14 },

  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 12,
  },
  titre:    { fontSize: 20, fontWeight: "700", color: C.textPrimary, marginBottom: 2 },
  sousTitre:{ fontSize: 12, color: C.textMuted },

  btnRecherche: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: "#2563EB", borderRadius: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnRechercheText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.bgCardBorder, marginBottom: 10,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 14 },

  chipsScroll: { marginBottom: 6 },
  chipsRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2, paddingBottom: 4 },
  chipsLabel: { color: C.textMuted, fontSize: 11, marginRight: 2 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: C.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  chipActive: { backgroundColor: "#1e3a5f", borderColor: "#3b82f6" },
  chipText:   { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: "#93C5FD" },

  resetBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end",
    paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8,
  },
  resetBtnText: { color: C.textMuted, fontSize: 11 },

  sourcesCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.bgInput, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: "#1e3a5f", marginBottom: 16,
  },
  sourcesText: { color: C.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },

  emptyCard: {
    backgroundColor: C.bgCard, borderRadius: 16,
    padding: 24, alignItems: "center", gap: 8, marginTop: 16,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  emptyTitre: { color: C.textPrimary, fontSize: 16, fontWeight: "600", marginTop: 8 },
  emptyTexte: { color: C.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },

  marcheCard: {
    backgroundColor: C.bgCard, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  marcheIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#1e3a5f", justifyContent: "center", alignItems: "center",
  },
  marcheTitre: { color: C.textPrimary, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  marcheMeta:  { flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" },
  marcheOrg:   { color: C.textMuted, fontSize: 11 },
  marcheLieu:  { color: C.textMuted, fontSize: 11 },
  marcheTags:  { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: "#1e3a5f", borderRadius: 6,
    borderWidth: 1, borderColor: "transparent",
  },
  tagActive: { borderColor: "#3b82f6" },
  tagText:      { color: "#60A5FA", fontSize: 10, fontWeight: "600" },
  marcheDate:   { color: "#4B5563", fontSize: 10, marginLeft: "auto" },
  marcheResume: { color: C.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
});

export default MarchesScreen;
