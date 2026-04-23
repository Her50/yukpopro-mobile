import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type Colors, useAuthStore } from "@/store";
import { authApi } from "@/api/client";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/data/countries";

export const LoginScreen = ({ navigation }: any) => {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Téléphone avec indicatif
  const [phoneCountry, setPhoneCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const { setAuth } = useAuthStore();

  const filteredCountries = useMemo(
    () =>
      countrySearch.trim() === ""
        ? COUNTRIES
        : COUNTRIES.filter(
            (c) =>
              c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
              c.dialCode.includes(countrySearch) ||
              c.iso2.toLowerCase().includes(countrySearch.toLowerCase())
          ),
    [countrySearch]
  );

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      await authApi.login(email, password);
      const user = await authApi.me();
      setAuth(user);
    } catch (err: any) {
      Alert.alert("Connexion échouée", err?.response?.data?.detail || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !nom) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    try {
      const telephone = phoneNumber ? `${phoneCountry.dialCode}${phoneNumber}` : undefined;
      await authApi.register({ email, password, nom, telephone } as any);
      await authApi.login(email, password);
      const user = await authApi.me();
      setAuth(user);
      navigation.navigate("Onboarding");
    } catch (err: any) {
      Alert.alert("Inscription échouée", err?.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brand}>
            Yukpo<Text style={styles.brandPro}>Pro</Text>
          </Text>
          <Text style={styles.tagline}>Intelligence Professionnelle Africaine</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode Toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "login" && styles.toggleBtnActive]}
              onPress={() => setMode("login")}
            >
              <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "register" && styles.toggleBtnActive]}
              onPress={() => setMode("register")}
            >
              <Text style={[styles.toggleText, mode === "register" && styles.toggleTextActive]}>
                Inscription
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Register fields ── */}
          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Jean Dupont"
                placeholderTextColor={C.textMuted}
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Téléphone (inscription seulement) ── */}
          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.label}>Téléphone (optionnel)</Text>
              <View style={styles.phoneRow}>
                {/* Sélecteur indicatif */}
                <TouchableOpacity
                  style={styles.dialCodeBtn}
                  onPress={() => { setCountrySearch(""); setShowCountryPicker(true); }}
                >
                  <Text style={styles.dialCodeFlag}>{phoneCountry.flag}</Text>
                  <Text style={styles.dialCodeText}>{phoneCountry.dialCode}</Text>
                  <Ionicons name="chevron-down" size={14} color={C.textMuted} />
                </TouchableOpacity>
                {/* Numéro */}
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="600 000 000"
                  placeholderTextColor={C.textMuted}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={mode === "login" ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === "login" ? "Se connecter" : "Créer mon compte"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2025 YukpoPro · Intelligence Professionnelle Africaine</Text>
      </ScrollView>

      {/* ── Modal sélecteur de pays ── */}
      <Modal visible={showCountryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Indicatif téléphonique</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Rechercher un pays ou indicatif..."
              placeholderTextColor={C.textMuted}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.iso2}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.iso2 === phoneCountry.iso2 && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setPhoneCountry(item);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.countryDial}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    marginBottom: 12, padding: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  logoImage: { width: 68, height: 68 },
  brand: { color: C.textPrimary, fontSize: 28, fontWeight: "700" },
  brandPro: { color: C.gold },
  tagline: { color: C.textMuted, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: C.bgCard, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  toggle: {
    flexDirection: "row", backgroundColor: C.bgInput,
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleText: { color: C.textMuted, fontWeight: "600", fontSize: 14 },
  toggleTextActive: { color: "#fff" },
  field: { marginBottom: 16 },
  label: { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, padding: 12,
  },
  // Téléphone
  phoneRow: { flexDirection: "row", gap: 8 },
  dialCodeBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  dialCodeFlag: { fontSize: 18 },
  dialCodeText: { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
  phoneInput: { flex: 1, marginBottom: 0 },
  submitBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: { color: C.textMuted, fontSize: 11, textAlign: "center", marginTop: 32 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.bgCardBorder,
  },
  modalTitle: { color: C.textPrimary, fontSize: 17, fontWeight: "700" },
  modalSearch: {
    backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15, margin: 16,
  },
  countryItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  countryItemActive: { backgroundColor: `${C.primary}20` },
  countryFlag: { fontSize: 22, width: 30 },
  countryName: { flex: 1, color: C.textPrimary, fontSize: 15 },
  countryDial: { color: C.textMuted, fontSize: 14, fontWeight: "600" },
});
