/**
 * Mes Documents — listing + téléchargement (Bureau partagé).
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Linking, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/store";
import { documentsApi } from "@/api/client";

type DocItem = {
  id?: number | string;
  nom?: string;
  nom_fichier?: string;
  fichier?: string;
  type?: string;
  type_document?: string;
  date?: string;
  date_creation?: string;
  created_at?: string;
};

const _nom = (d: DocItem) => d.nom || d.nom_fichier || d.fichier || `doc-${d.id}`;
const _type = (d: DocItem) => d.type || d.type_document || "—";
const _date = (d: DocItem) => d.date || d.date_creation || d.created_at || "";

export const DocumentsScreen = () => {
  const [docs, setDocs]       = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await documentsApi.lister();
      setDocs(r.documents || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const telecharger = (d: DocItem) => {
    const nom = _nom(d);
    if (!nom) return Alert.alert("Document", "Nom de fichier indisponible");
    Linking.openURL(documentsApi.telechargerUrl(nom));
  };

  const supprimer = (d: DocItem) => {
    if (!d.id) return;
    Alert.alert("Confirmer", `Supprimer "${_nom(d)}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await documentsApi.supprimer(d.id!);
            setDocs((prev) => prev.filter((x) => x.id !== d.id));
          } catch (e: any) {
            Alert.alert("Erreur", e?.response?.data?.detail || "Échec");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: DocItem }) => (
    <View style={styles.item}>
      <Ionicons name="document-text" size={28} color={COLORS.primary} />
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={1}>{_nom(item)}</Text>
        <Text style={styles.itemMeta}>{_type(item)} · {_date(item).slice(0, 10)}</Text>
      </View>
      <TouchableOpacity onPress={() => telecharger(item)} style={styles.iconBtn}>
        <Ionicons name="cloud-download-outline" size={22} color="#fff" />
      </TouchableOpacity>
      {item.id && (
        <TouchableOpacity onPress={() => supprimer(item)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && docs.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Mes Documents</Text>
        <Text style={styles.muted}>{docs.length} document(s)</Text>
      </View>
      {error && <Text style={styles.err}>{error}</Text>}
      <FlatList
        data={docs}
        keyExtractor={(d, i) => String(d.id ?? _nom(d) ?? i)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={charger} tintColor="#fff" />}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun document. Générez un rapport ou un livrable pour commencer.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#0B0F1A" },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0F1A" },
  header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  h1:         { color: "#fff", fontSize: 22, fontWeight: "700" },
  muted:      { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  err:        { color: "#F87171", paddingHorizontal: 16, marginVertical: 8 },
  empty:      { color: "#6B7280", textAlign: "center", marginTop: 48, paddingHorizontal: 24 },
  item:       { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: "#111827", marginVertical: 6 },
  itemBody:   { flex: 1, marginLeft: 12 },
  itemTitle:  { color: "#fff", fontWeight: "600", fontSize: 14 },
  itemMeta:   { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  iconBtn:    { padding: 6, marginLeft: 4 },
});
