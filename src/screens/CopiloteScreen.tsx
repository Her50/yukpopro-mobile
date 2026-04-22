import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, useCopiloteStore, MobileMessage } from "@/store";
import { copiloteApi } from "@/api/client";

const TypingDots = () => {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return <Text style={styles.typingDots}>{"●".repeat(dot + 1)}</Text>;
};

const MessageBubble = ({ msg }: { msg: MobileMessage }) => {
  const isUser = msg.role === "user";
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>Y</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {msg.loading ? (
          <TypingDots />
        ) : (
          <>
            <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
              {msg.content}
            </Text>
            {msg.agent_utilise && (
              <View style={styles.agentBadge}>
                <Ionicons name="hardware-chip-outline" size={11} color={COLORS.accent} />
                <Text style={styles.agentBadgeText}>{msg.agent_utilise}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const SUGGESTIONS = [
  "Comment optimiser ma fiscalité ?",
  "Explique-moi la norme SYSCOHADA",
  "Prépare un tableau d'amortissement",
  "Quels sont mes droits OHADA ?",
  "Analyse un contrat de travail",
  "Calcule le TEG d'un crédit",
];

export const CopiloteScreen = ({ route }: any) => {
  const { messages, isLoading, addMessage, updateLastMessage, setLoading, clearSession, setSessionId } =
    useCopiloteStore();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  // If navigated with an initialMessage (from dashboard suggestion)
  useEffect(() => {
    if (route?.params?.initialMessage) {
      setInput(route.params.initialMessage);
    }
  }, []);

  const scrollToBottom = () => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    setInput("");

    const userMsg: MobileMessage = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    const loadingMsg: MobileMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      loading: true,
    };
    addMessage(loadingMsg);
    setLoading(true);

    try {
      const res = await copiloteApi.chat(msg);
      updateLastMessage(res.reponse || res.message || "", res.agent_utilise || null);
      if (res.session_id) setSessionId(res.session_id);
    } catch (err: any) {
      updateLastMessage(
        err?.response?.data?.detail || "Une erreur est survenue. Veuillez réessayer.",
        null
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    Alert.alert("Nouvelle conversation", "Effacer l'historique et démarrer une nouvelle session ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", style: "destructive", onPress: () => { clearSession(); copiloteApi.nouveau(); } },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>Y</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Yukpo Assistant</Text>
            <Text style={styles.headerSub}>Yukpo Pro · Toujours disponible</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleNewSession}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>Y</Text>
          </View>
          <Text style={styles.emptyTitle}>Bonjour, je suis votre Copilote Yukpo</Text>
          <Text style={styles.emptySub}>
            Posez-moi n'importe quelle question professionnelle. Je peux aussi faire appel aux agents spécialisés selon vos besoins.
          </Text>
          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => sendMessage(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Posez votre question..."
          placeholderTextColor={COLORS.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgCardBorder,
    backgroundColor: COLORS.bgCard,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },
  headerSub: { color: COLORS.textMuted, fontSize: 11 },
  newBtn: { padding: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}30`,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIconText: { color: COLORS.primary, fontSize: 32, fontWeight: "900" },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  suggestionsGrid: { width: "100%", gap: 8 },
  suggestionChip: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
  },
  suggestionText: { color: COLORS.textSecondary, fontSize: 13 },
  messageList: { padding: 16, gap: 12, paddingBottom: 8 },
  bubbleRow: { flexDirection: "row", gap: 10, maxWidth: "85%" },
  bubbleRowUser: { alignSelf: "flex-end", justifyContent: "flex-end" },
  bubbleRowAssistant: { alignSelf: "flex-start" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}30`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  bubble: {
    borderRadius: 16,
    padding: 14,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  bubbleTextUser: { color: "#fff" },
  typingDots: { color: COLORS.textMuted, fontSize: 20, letterSpacing: 2 },
  agentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCardBorder,
  },
  agentBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: "600" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCardBorder,
    backgroundColor: COLORS.bgCard,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
