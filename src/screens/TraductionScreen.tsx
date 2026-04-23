/**
 * Bureau Traduction — texte + fichier (DOCX/PDF/PPTX) FR<->EN<->ES<->...
 * Utilise traductionApi (POST /bureau/traduction/texte et /bureau/traduction/fichier).
 */
import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Linking,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors } from "@/store";
import { traductionApi } from "@/api/client";

const LANGUES: Array<{ code: string; label: string; flag: string }> = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ar", label: "العربية",   flag: "🇸🇦" },
];

export const TraductionScreen = () => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [source, setSource] = useState("fr");
  const [cible, setCible]   = useState("en");
  const [contenu, setContenu] = useState("");
  const [traduction, setTraduction] = useState("");
  const [busy, setBusy] = useState(false);
  const [fichierUrl, setFichierUrl] = useState<string | null>(null);

  const traduireTexte = async () => {
    if (!contenu.trim()) {
      Alert.alert("Texte manquant", "Saisissez le texte à traduire.");
      return;
    }
    setBusy(true);
    try {
      const r = await traductionApi.texte({
        contenu, langue_source: source, langue_cible: cible,
      });
      setTraduction(r.texte_traduit || "");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail || e?.message || "Échec de la traduction");
    } finally {
      setBusy(false);
    }
  };

  const traduireFichier = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      setBusy(true);
      const r = await traductionApi.fichier(
        { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" },
        source, cible,
      );
      if (r.fichier_id) setFichierUrl(traductionApi.telechargerUrl(r.fichier_id));
    } catch (e: any) {
      Alert.alert("Erreur fichier", e?.response?.data?.detail || e?.message || "Échec");
    } finally {
      setBusy(false);
    }
  };

  const renderLangs = (val: string, set: (s: string) => void) => (
    <View style={styles.langRow}>
      {LANGUES.map((l) => (
        <TouchableOpacity
          key={l.code}
          style={[styles.langBtn, val === l.code && styles.langBtnActive]}
          onPress={() => set(l.code)}
        >
          <Text style={styles.langFlag}>{l.flag}</Text>
          <Text style={[styles.langLabel, val === l.code && { color: "#fff" }]}>{l.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
      <Text style={styles.h1}>Bureau · Traduction</Text>
      <Text style={styles.muted}>FR · EN · ES · PT · AR — Texte + DOCX/PDF/PPTX</Text>

      <Text style={styles.lbl}>De</Text>
      {renderLangs(source, setSource)}
      <Text style={styles.lbl}>Vers</Text>
      {renderLangs(cible, setCible)}

      <Text style={styles.lbl}>Texte à traduire</Text>
      <TextInput
        value={contenu}
        onChangeText={setContenu}
        style={styles.textarea}
        multiline
        placeholder="Collez le texte ici…"
        placeholderTextColor={C.textMuted}
      />
      <TouchableOpacity style={styles.btn} onPress={traduireTexte} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> :
          <><Ionicons name="language" size={18} color="#fff" /><Text style={styles.btnTxt}>  Traduire le texte</Text></>}
      </TouchableOpacity>

      {!!traduction && (
        <View style={styles.outBox}>
          <Text style={styles.outTitle}>Traduction</Text>
          <Text style={styles.outTxt}>{traduction}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.lbl}>Ou traduire un fichier (DOCX/PDF/PPTX)</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: C.primary }]} onPress={traduireFichier} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> :
          <><Ionicons name="document-attach" size={18} color="#fff" /><Text style={styles.btnTxt}>  Choisir un fichier…</Text></>}
      </TouchableOpacity>

      {fichierUrl && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: C.success }]} onPress={() => Linking.openURL(fichierUrl)}>
          <Ionicons name="cloud-download" size={18} color="#fff" />
          <Text style={styles.btnTxt}>  Télécharger le fichier traduit</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  h1:         { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  muted:      { color: C.textMuted, fontSize: 12, marginTop: 2, marginBottom: 16 },
  lbl:        { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  langRow:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  langBtn:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder },
  langBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  langFlag:   { fontSize: 14, marginRight: 4 },
  langLabel:  { color: C.textSecondary, fontSize: 12, fontWeight: "600" },
  textarea:   { backgroundColor: C.bgInput, color: C.textPrimary, minHeight: 120, padding: 10, borderRadius: 8, textAlignVertical: "top", borderWidth: 1, borderColor: C.bgCardBorder },
  btn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.primary, paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  btnTxt:     { color: "#fff", fontWeight: "700" },
  outBox:     { backgroundColor: C.bgCard, padding: 12, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: C.bgCardBorder },
  outTitle:   { color: C.primary, fontWeight: "700", marginBottom: 6 },
  outTxt:     { color: C.textSecondary, lineHeight: 20 },
  divider:    { height: 1, backgroundColor: C.bgCardBorder, marginVertical: 24 },
});
