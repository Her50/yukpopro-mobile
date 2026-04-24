/**
 * Mes Documents — historique des documents générés par l'IA (YukpoPro).
 * Affiche titre, type, date. Permet retélécharger, supprimer et améliorer via chat.
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Linking, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors, useCopiloteStore } from "@/store";
import { generateurApi, type DocumentHistorique } from "@/api/client";

export const DocumentsScreen = ({ navigation }: any) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const setActiveDocument = useCopiloteStore(s => s.setActiveDocument);
  const clearSession = useCopiloteStore(s => s.clearSession);

  const [docs, setDocs]       = useState<DocumentHistorique[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await generateurApi.historiqueDocuments();
      setDocs(r.documents || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const telecharger = (d: DocumentHistorique) => {
    if (!d.fichier) return Alert.alert("Document", "Fichier indisponible");
    Linking.openURL(generateurApi.urlTelechargement(d.fichier));
  };

  const supprimer = (d: DocumentHistorique) => {
    Alert.alert("Confirmer", `Supprimer "${d.titre}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await generateurApi.supprimerDocument(d.id);
            setDocs((prev) => prev.filter((x) => x.id !== d.id));
          } catch (e: any) {
            Alert.alert("Erreur", e?.response?.data?.detail || "Échec");
          }
        },
      },
    ]);
  };

  const ameliorerViaChat = (d: DocumentHistorique) => {
    clearSession();
    setActiveDocument({
      id: d.id,
      titre: d.titre,
      type_doc: d.type_doc,
      contenu_genere: d.contenu_genere,
    });
    navigation?.navigate?.("YukpoIA");
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return iso; }
  };

  const renderItem = ({ item }: { item: DocumentHistorique }) => (
    <View style={styles.item}>
      <Ionicons
        name={item.type_doc?.startsWith("slides") ? "easel-outline" : "document-text"}
        size={28}
        color={C.primary}
      />
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.titre}</Text>
        <Text style={styles.itemMeta}>{item.type_doc} · {formatDate(item.cree_le)}</Text>
      </View>
      <TouchableOpacity onPress={() => ameliorerViaChat(item)} style={styles.iconBtn} accessibilityLabel="Améliorer via chat">
        <Ionicons name="chatbubble-ellipses-outline" size={22} color={C.primary} />
      </TouchableOpacity>
      {item.fichier && (
        <TouchableOpacity onPress={() => telecharger(item)} style={styles.iconBtn}>
          <Ionicons name="cloud-download-outline" size={22} color={C.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => supprimer(item)} style={styles.iconBtn}>
        <Ionicons name="trash-outline" size={22} color={C.error} />
      </TouchableOpacity>
    </View>
  );

  if (loading && docs.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={C.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Mes Documents</Text>
        <Text style={styles.muted}>{docs.length} document(s) · Touchez 💬 pour améliorer via le chat</Text>
      </View>
      {error && <Text style={styles.err}>{error}</Text>}
      <FlatList
        data={docs}
        keyExtractor={(d) => String(d.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={charger} tintColor={C.primary} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun document. Générez un rapport ou un livrable pour commencer.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
      />
    </View>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  h1:         { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  muted:      { color: C.textMuted, fontSize: 12, marginTop: 2 },
  err:        { color: C.error, paddingHorizontal: 16, marginVertical: 8 },
  empty:      { color: C.textMuted, textAlign: "center", marginTop: 48, paddingHorizontal: 24 },
  item:       { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: C.bgCard, marginVertical: 6, borderWidth: 1, borderColor: C.bgCardBorder },
  itemBody:   { flex: 1, marginLeft: 12 },
  itemTitle:  { color: C.textPrimary, fontWeight: "600", fontSize: 14 },
  itemMeta:   { color: C.textMuted, fontSize: 12, marginTop: 2 },
  iconBtn:    { padding: 6, marginLeft: 4 },
});
