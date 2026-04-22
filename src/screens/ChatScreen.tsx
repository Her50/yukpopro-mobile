/**
 * Yukpo IA — Chat unifié mobile
 * Remplace CopiloteScreen + AgentsScreen + GenerateursScreen
 * Inclut : upload fichiers, dictée vocale (expo-av + Whisper), agents IA
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { COLORS, useAuthStore, useProfilStore } from "@/store";
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
  const { user } = useAuthStore();
  const { profil } = useProfilStore();
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
    const title = "Nouvelle conversation";
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
      });

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: res.reponse, loading: false, agent: res.agent_utilise, fichiers: res.fichiers_generes }
          : m
      ));

      // Mise à jour titre session
      if (sessions.find(s => s.id === activeSessionId)?.title === "Nouvelle conversation") {
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
              <Ionicons name="document-outline" size={12} color={COLORS.textMuted} />
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
              <Ionicons name="hardware-chip-outline" size={11} color={COLORS.primary} />
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
                    <Ionicons name="download-outline" size={14} color={COLORS.primary} />
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
                <Ionicons name="hardware-chip-outline" size={11} color={COLORS.primary} />
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
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
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
            <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={newSession}>
            <Ionicons name="add" size={22} color={COLORS.textSecondary} />
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

      {/* Fichier attaché */}
      {attachedFile && (
        <View style={styles.fileBar}>
          <Ionicons name="document-outline" size={16} color={COLORS.primary} />
          <Text style={styles.fileBarName} numberOfLines={1}>{attachedFile.name}</Text>
          <TouchableOpacity onPress={() => setAttachedFile(null)}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickDocument} disabled={loading}>
          <Ionicons name="attach" size={22} color={loading ? COLORS.textMuted : COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attachBtn, isRecording && styles.micActive]}
          onPress={handleMicPress}
          disabled={loading || isTranscribing}
        >
          {isTranscribing
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={22}
                color={isRecording ? "#ef4444" : (loading ? COLORS.textMuted : COLORS.textSecondary)}
              />
          }
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={attachedFile ? "Décrivez ce que faire avec ce fichier..." : "Posez votre question..."}
          placeholderTextColor={COLORS.textMuted}
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
              <Text style={styles.historyTitle}>Conversations</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.newSessionBtn} onPress={() => { newSession(); setShowHistory(false); }}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.newSessionText}>Nouvelle conversation</Text>
            </TouchableOpacity>
            <ScrollView>
              {sessions.length === 0
                ? <Text style={styles.historyEmpty}>Aucune conversation</Text>
                : sessions.map(s => (
                  <TouchableOpacity key={s.id} style={styles.sessionItem} onPress={() => loadSession(s)}>
                    <Ionicons name="chatbubble-outline" size={16} color={COLORS.textMuted} />
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

const markdownStyles = {
  body:        { color: COLORS.textPrimary, fontSize: 14, lineHeight: 21 },
  heading1:    { color: "#fff", fontSize: 17, fontWeight: "700" as const, marginTop: 8, marginBottom: 4 },
  heading2:    { color: "#fff", fontSize: 15, fontWeight: "700" as const, marginTop: 6, marginBottom: 3 },
  heading3:    { color: "#e2e8f0", fontSize: 14, fontWeight: "600" as const, marginTop: 4, marginBottom: 2 },
  strong:      { color: "#fff", fontWeight: "700" as const },
  em:          { fontStyle: "italic" as const, color: "#cbd5e1" },
  code_inline: { backgroundColor: "#1e293b", color: "#7dd3fc", fontFamily: "monospace", fontSize: 13, paddingHorizontal: 4, borderRadius: 3 },
  fence:       { backgroundColor: "#1e293b", padding: 10, borderRadius: 6, marginVertical: 4 },
  code_block:  { color: "#7dd3fc", fontFamily: "monospace", fontSize: 12 },
  bullet_list: { marginVertical: 2 },
  ordered_list:{ marginVertical: 2 },
  list_item:   { color: COLORS.textPrimary, fontSize: 14, marginVertical: 1 },
  table:       { borderWidth: 1, borderColor: "#374151", borderRadius: 4, marginVertical: 4 },
  th:          { backgroundColor: "#1e293b", color: "#94a3b8", fontWeight: "700" as const, padding: 6, fontSize: 12 },
  td:          { color: "#cbd5e1", padding: 6, fontSize: 12, borderTopWidth: 1, borderColor: "#374151" },
  blockquote:  { borderLeftWidth: 3, borderLeftColor: "#7c3aed", paddingLeft: 8, marginLeft: 0, backgroundColor: "#1e293b20" },
  hr:          { backgroundColor: "#374151", height: 1, marginVertical: 8 },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.bgCardBorder,
    backgroundColor: COLORS.bgCard,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  headerSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6, borderRadius: 8 },
  // Welcome
  welcomeScroll: { flexGrow: 1 },
  welcome: { padding: 24, alignItems: "center" },
  welcomeAvatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  welcomeEmoji: { fontSize: 32 },
  welcomeTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  welcomeBadge: { color: COLORS.primary, fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 },
  welcomeSubtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  agentsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 },
  agentChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: `${COLORS.primary}20`, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  agentChipText: { color: COLORS.primary, fontSize: 11, fontWeight: "600" },
  suggTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 10, alignSelf: "flex-start" },
  suggBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8,
  },
  suggText: { color: COLORS.textSecondary, fontSize: 14, flex: 1 },
  // Messages
  messagesList: { padding: 16, gap: 16 },
  userMsgWrapper: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: COLORS.primary, borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: "82%",
  },
  userText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  assistantMsgWrapper: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  assistantAvatar: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarEmoji: { fontSize: 16 },
  assistantContent: { flex: 1 },
  agentBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4,
  },
  agentBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: "600" },
  assistantText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  typingDots: { flexDirection: "row", gap: 4, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  downloadRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  downloadText: { color: COLORS.textSecondary, fontSize: 12, maxWidth: 150 },
  // File chips
  fileChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4, alignSelf: "flex-end",
  },
  fileChipText: { color: COLORS.textMuted, fontSize: 11, maxWidth: 150 },
  // File bar
  fileBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.bgCardBorder,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  fileBarName: { flex: 1, color: COLORS.textSecondary, fontSize: 13 },
  // Input
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: COLORS.bgCardBorder,
    backgroundColor: COLORS.bgCard,
  },
  attachBtn: { padding: 8 },
  micActive: { backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 10 },
  input: {
    flex: 1, backgroundColor: "#0F172A",
    borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 14, maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 12, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  // History modal
  historyOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  historyCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "70%", paddingBottom: 24,
  },
  historyHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.bgCardBorder,
  },
  historyTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "700" },
  newSessionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.bgCardBorder,
  },
  newSessionText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  sessionItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  sessionTitle: { color: COLORS.textSecondary, fontSize: 14, flex: 1 },
  historyEmpty: { color: COLORS.textMuted, textAlign: "center", marginTop: 24, fontSize: 14 },
});
