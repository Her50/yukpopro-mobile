/**
 * YukpoPro — Chat unifié mobile
 * Remplace CopiloteScreen + AgentsScreen + GenerateursScreen
 * Inclut : upload fichiers, dictée vocale (expo-av), agents Yukpo YukpoPro
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useTranslation } from "react-i18next";
import { useColors, type Colors, useAuthStore, useProfilStore, useCopiloteStore } from "@/store";
import { chatApi, reunionsApi, generateurApi } from "@/api/client";
import { METIERS_CONFIG } from "@/data/metiers-config";

// expo-av optionnel
let Audio: any = null;
try { Audio = require("expo-av").Audio; } catch (_) {}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  agent?: string | null;
  fichiers?: string[];
}

interface AttachedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

// ── Composant principal ───────────────────────────────────────────────────────

export const ChatScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const markdownStyles = useMemo(() => makeMarkdownStyles(C), [C]);
  const { user } = useAuthStore();
  const { profil } = useProfilStore();
  const activeDocument = useCopiloteStore(s => s.activeDocument);
  const setActiveDocument = useCopiloteStore(s => s.setActiveDocument);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<{ id: string; title: string; messages: Message[] }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<any>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const metierInfo = METIERS_CONFIG[profil?.metier ?? "default"] ?? METIERS_CONFIG.default;

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── Session ───────────────────────────────────────────────────────────────

  const newSession = useCallback(() => {
    if (messages.length > 0 && activeSessionId) {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, messages } : s
      ));
    }
    const id = Date.now().toString();
    const title = t('chat.newConversation');
    setSessions(prev => [{ id, title, messages: [] }, ...prev].slice(0, 30));
    setActiveSessionId(id);
    setMessages([]);
    setAttachedFile(null);
  }, [messages, activeSessionId]);

  const loadSession = (session: { id: string; title: string; messages: Message[] }) => {
    // Sauvegarder session courante
    if (messages.length > 0 && activeSessionId) {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, messages } : s
      ));
    }
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  // ── Envoi message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content && !attachedFile) return;
    if (loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      fichiers: attachedFile ? [attachedFile.name] : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const file = attachedFile;
    setAttachedFile(null);

    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      loading: true,
    };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      let fileData = undefined;
      if (file) {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = { nom: file.name, contenu: `data:${file.type};base64,${base64}`, type: file.type };
      }

      const res = await chatApi.send({
        message: content,
        pays: profil?.pays,
        fichiers: fileData ? [fileData] : undefined,
        document_ref: activeDocument ? {
          id: activeDocument.id,
          titre: activeDocument.titre,
          type_doc: activeDocument.type_doc,
          contenu_genere: activeDocument.contenu_genere,
        } : undefined,
      });

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: res.reponse, loading: false, agent: res.agent_utilise, fichiers: res.fichiers_generes }
          : m
      ));

      // Mise à jour titre session
      if (sessions.find(s => s.id === activeSessionId)?.title === t('chat.newConversation')) {
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId
            ? { ...s, title: content.slice(0, 40) }
            : s
        ));
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.code === "CREDITS_EPUISES") {
        setMessages(prev => prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: `⚠️ **${detail.message}**\n\n${detail.action}`, loading: false }
            : m
        ));
        Alert.alert(
          "Crédits épuisés",
          detail.message + "\n\n" + detail.action,
          [
            { text: "Annuler", style: "cancel" },
            { text: "Recharger / Changer de plan", onPress: () => navigation.navigate("Abonnement") },
          ]
        );
      } else {
        const msg = typeof detail === "string" ? detail : "Erreur de connexion";
        setMessages(prev => prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: `⚠️ ${msg}`, loading: false }
            : m
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, attachedFile, profil, sessions, activeSessionId]);

  // ── Upload fichier ────────────────────────────────────────────────────────

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain", "text/csv", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const f = result.assets[0];
      setAttachedFile({ uri: f.uri, name: f.name, type: f.mimeType ?? "application/octet-stream", size: f.size });
    } catch {
      Alert.alert("Erreur", "Impossible de sélectionner le fichier");
    }
  };

  // ── Dictée vocale ─────────────────────────────────────────────────────────

  const handleMicPress = async () => {
    if (!Audio) {
      Alert.alert("Non disponible", "La dictée vocale nécessite expo-av. Relancez après npm install.");
      return;
    }

    if (isRecording) {
      // Arrêter + transcrire
      try {
        setIsRecording(false);
        setIsTranscribing(true);
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        if (!uri) throw new Error("URI audio introuvable");

        const res = await reunionsApi.transcrireDirect(uri, "auto");
        const texte = res.transcription?.trim();
        if (texte) {
          setInput(prev => prev ? prev + " " + texte : texte);
          inputRef.current?.focus();
        } else {
          Alert.alert("Transcription vide", "Aucun texte détecté dans l'audio.");
        }
      } catch (err: any) {
        Alert.alert("Erreur transcription", err?.response?.data?.detail || err.message || "Impossible de transcrire l'audio.");
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Démarrer enregistrement
      try {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission refusée", "L'accès au microphone est nécessaire pour la dictée vocale.");
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
      } catch (err: any) {
        Alert.alert("Erreur microphone", err.message || "Impossible de démarrer l'enregistrement.");
      }
    }
  };

  // ── Rendu message ─────────────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    if (isUser) {
      return (
        <View style={styles.userMsgWrapper}>
          {item.fichiers?.map((f, i) => (
            <View key={i} style={styles.fileChip}>
              <Ionicons name="document-outline" size={12} color={C.textMuted} />
              <Text style={styles.fileChipText} numberOfLines={1}>{f}</Text>
            </View>
          ))}
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantMsgWrapper}>
        <View style={styles.assistantAvatar}>
          <Text style={styles.avatarEmoji}>{metierInfo.emoji}</Text>
        </View>
        <View style={styles.assistantContent}>
          {item.agent && (
            <View style={styles.agentBadge}>
              <Ionicons name="hardware-chip-outline" size={11} color={C.primary} />
              <Text style={styles.agentBadgeText}>{item.agent}</Text>
            </View>
          )}
          {item.loading ? (
            <View style={styles.typingDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.3 }]} />
              ))}
            </View>
          ) : (
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          )}
          {item.fichiers && item.fichiers.length > 0 && !item.loading && (
            <View style={styles.downloadRow}>
              {item.fichiers.map((f, i) => {
                const nomFichier = f.split(/[/\\]/).pop() || f;
                const url = generateurApi.urlTelechargement(nomFichier);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.downloadBtn}
                    onPress={() => Linking.openURL(url)}
                  >
                    <Ionicons name="download-outline" size={14} color={C.primary} />
                    <Text style={styles.downloadText} numberOfLines={1}>
                      Télécharger — {nomFichier}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Message de bienvenue contextuel ──────────────────────────────────────

  const buildWelcomeText = () => {
    const prenom = (user as any)?.prenom || (user as any)?.nom?.split(" ")[0] || "";
    if (!profil?.metier) {
      return { prenom, text: "Je suis Yukpo Pro, votre assistant professionnel intelligent. Posez-moi une question, envoyez un document ou demandez une analyse — je m'adapte à votre demande en langage naturel." };
    }
    const niv = profil.niveau_expertise === "expert" || profil.niveau_expertise === "senior" ? "expérimenté" : "professionnel";
    const text = `Je suis Yukpo Pro, votre assistant dédié aux ${niv}s en ${metierInfo.label}${profil.pays ? ` (${profil.pays})` : ""}. Je peux activer des agents spécialisés, générer des rapports, traduire vos fichiers et gérer vos réunions. Posez votre première question.`;
    return { prenom, text };
  };

  const WelcomeView = () => {
    const { prenom, text } = buildWelcomeText();
    return (
      <View style={styles.welcome}>
        <View style={styles.welcomeAvatar}>
          <Text style={styles.welcomeEmoji}>{metierInfo.emoji}</Text>
        </View>
        <Text style={styles.welcomeTitle}>
          {prenom ? `Bonjour, ${prenom} !` : "Bonjour !"}
        </Text>
        <Text style={styles.welcomeBadge}>Yukpo Pro · {metierInfo.label}</Text>
        <Text style={styles.welcomeSubtitle}>{text}</Text>

        {/* Agents disponibles */}
        {metierInfo.agents?.length > 0 && (
          <View style={styles.agentsRow}>
            {metierInfo.agents.slice(0, 3).map((a: string) => (
              <View key={a} style={styles.agentChip}>
                <Ionicons name="hardware-chip-outline" size={11} color={C.primary} />
                <Text style={styles.agentChipText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggestions rapides */}
        <Text style={styles.suggTitle}>Commencer avec :</Text>
        {metierInfo.suggestions.slice(0, 4).map((s: string) => (
          <TouchableOpacity
            key={s}
            style={styles.suggBtn}
            onPress={() => sendMessage(s)}
          >
            <Text style={styles.suggText} numberOfLines={2}>{s}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Yukpo Pro</Text>
            <Text style={styles.headerSub}>
              {profil?.metier ? metierInfo.label : "Assistant intelligent"}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowHistory(true)}>
            <Ionicons name="time-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={newSession}>
            <Ionicons name="add" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
          <WelcomeView />
        </ScrollView>
      ) : (
        <FlatList
          ref={scrollRef as any}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Document en cours d'édition */}
      {activeDocument && (
        <View style={[styles.fileBar, { backgroundColor: C.primary + "15", borderColor: C.primary + "40" }]}>
          <Ionicons name="create-outline" size={16} color={C.primary} />
          <Text style={[styles.fileBarName, { color: C.primary }]} numberOfLines={1}>
            Édition : {activeDocument.titre}
          </Text>
          <TouchableOpacity onPress={() => setActiveDocument(null)}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Fichier attaché */}
      {attachedFile && (
        <View style={styles.fileBar}>
          <Ionicons name="document-outline" size={16} color={C.primary} />
          <Text style={styles.fileBarName} numberOfLines={1}>{attachedFile.name}</Text>
          <TouchableOpacity onPress={() => setAttachedFile(null)}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickDocument} disabled={loading}>
          <Ionicons name="attach" size={22} color={loading ? C.textMuted : C.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attachBtn, isRecording && styles.micActive]}
          onPress={handleMicPress}
          disabled={loading || isTranscribing}
        >
          {isTranscribing
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={22}
                color={isRecording ? "#ef4444" : (loading ? C.textMuted : C.textSecondary)}
              />
          }
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={attachedFile ? t('chat.attachPlaceholder') : t('chat.placeholder')}
          placeholderTextColor={C.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() && !attachedFile || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={(!input.trim() && !attachedFile) || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Modal historique */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={styles.historyOverlay}>
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{t('chat.history')}</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.newSessionBtn} onPress={() => { newSession(); setShowHistory(false); }}>
              <Ionicons name="add-circle-outline" size={18} color={C.primary} />
              <Text style={styles.newSessionText}>{t('chat.newConversation')}</Text>
            </TouchableOpacity>
            <ScrollView>
              {sessions.length === 0
                ? <Text style={styles.historyEmpty}>{t('chat.noConversations')}</Text>
                : sessions.map(s => (
                  <TouchableOpacity key={s.id} style={styles.sessionItem} onPress={() => loadSession(s)}>
                    <Ionicons name="chatbubble-outline" size={16} color={C.textMuted} />
                    <Text style={styles.sessionTitle} numberOfLines={2}>{s.title}</Text>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ── Styles Markdown ───────────────────────────────────────────────────────────

const makeMarkdownStyles = (C: Colors) => ({
  body:        { color: C.textPrimary, fontSize: 14, lineHeight: 21 },
  heading1:    { color: C.textPrimary, fontSize: 17, fontWeight: "700" as const, marginTop: 8, marginBottom: 4 },
  heading2:    { color: C.textPrimary, fontSize: 15, fontWeight: "700" as const, marginTop: 6, marginBottom: 3 },
  heading3:    { color: C.textSecondary, fontSize: 14, fontWeight: "600" as const, marginTop: 4, marginBottom: 2 },
  strong:      { color: C.textPrimary, fontWeight: "700" as const },
  em:          { fontStyle: "italic" as const, color: C.textSecondary },
  code_inline: { backgroundColor: C.bgInput, color: C.accent, fontFamily: "monospace", fontSize: 13, paddingHorizontal: 4, borderRadius: 3 },
  fence:       { backgroundColor: C.bgInput, padding: 10, borderRadius: 6, marginVertical: 4 },
  code_block:  { color: C.accent, fontFamily: "monospace", fontSize: 12 },
  bullet_list: { marginVertical: 2 },
  ordered_list:{ marginVertical: 2 },
  list_item:   { color: C.textPrimary, fontSize: 14, marginVertical: 1 },
  table:       { borderWidth: 1, borderColor: C.bgCardBorder, borderRadius: 4, marginVertical: 4 },
  th:          { backgroundColor: C.bgInput, color: C.textMuted, fontWeight: "700" as const, padding: 6, fontSize: 12 },
  td:          { color: C.textSecondary, padding: 6, fontSize: 12, borderTopWidth: 1, borderColor: C.bgCardBorder },
  blockquote:  { borderLeftWidth: 3, borderLeftColor: C.primary, paddingLeft: 8, marginLeft: 0, backgroundColor: `${C.primary}10` },
  hr:          { backgroundColor: C.bgCardBorder, height: 1, marginVertical: 8 },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.bgCardBorder,
    backgroundColor: C.bgCard,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: C.textPrimary, fontSize: 15, fontWeight: "700" },
  headerSub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6, borderRadius: 8 },
  // Welcome
  welcomeScroll: { flexGrow: 1 },
  welcome: { padding: 24, alignItems: "center" },
  welcomeAvatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  welcomeEmoji: { fontSize: 32 },
  welcomeTitle: { color: C.textPrimary, fontSize: 22, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  welcomeBadge: { color: C.primary, fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 },
  welcomeSubtitle: { color: C.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  agentsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 },
  agentChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: `${C.primary}20`, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${C.primary}40`,
  },
  agentChipText: { color: C.primary, fontSize: 11, fontWeight: "600" },
  suggTitle: { color: C.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 10, alignSelf: "flex-start" },
  suggBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8,
  },
  suggText: { color: C.textSecondary, fontSize: 14, flex: 1 },
  // Messages
  messagesList: { padding: 16, gap: 16 },
  userMsgWrapper: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: C.primary, borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: "82%",
  },
  userText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  assistantMsgWrapper: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  assistantAvatar: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarEmoji: { fontSize: 16 },
  assistantContent: { flex: 1 },
  agentBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4,
  },
  agentBadgeText: { color: C.primary, fontSize: 11, fontWeight: "600" },
  assistantText: { color: C.textPrimary, fontSize: 14, lineHeight: 22 },
  typingDots: { flexDirection: "row", gap: 4, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textMuted },
  downloadRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  downloadText: { color: C.textSecondary, fontSize: 12, maxWidth: 150 },
  // File chips
  fileChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.bgCard, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4, alignSelf: "flex-end",
  },
  fileChipText: { color: C.textMuted, fontSize: 11, maxWidth: 150 },
  // File bar
  fileBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.bgCardBorder,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  fileBarName: { flex: 1, color: C.textSecondary, fontSize: 13 },
  // Input
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: C.bgCardBorder,
    backgroundColor: C.bgCard,
  },
  attachBtn: { padding: 8 },
  micActive: { backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 10 },
  input: {
    flex: 1, backgroundColor: C.bgInput,
    borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    color: C.textPrimary, fontSize: 14, maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    padding: 12, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  // History modal
  historyOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  historyCard: {
    backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "70%", paddingBottom: 24,
  },
  historyHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.bgCardBorder,
  },
  historyTitle: { color: C.textPrimary, fontSize: 17, fontWeight: "700" },
  newSessionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.bgCardBorder,
  },
  newSessionText: { color: C.primary, fontSize: 15, fontWeight: "600" },
  sessionItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  sessionTitle: { color: C.textSecondary, fontSize: 14, flex: 1 },
  historyEmpty: { color: C.textMuted, textAlign: "center", marginTop: 24, fontSize: 14 },
});
