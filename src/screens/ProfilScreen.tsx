import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { useColors, type Colors, useAuthStore, useProfilStore, useThemeStore } from "@/store";
import { profilApi, authApi } from "@/api/client";

// Combobox modal avec recherche pour listes longues
const ComboField = ({
  label, value, onChange, options, placeholder, C,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; C: Colors;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <>
      <Text style={{ color: C.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 12 }}>
        {label}
      </Text>
      <TouchableOpacity
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder,
          borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        }}
        onPress={() => { setOpen(true); setSearch(""); }}
        activeOpacity={0.8}
      >
        <Text style={{ color: value ? C.textPrimary : C.textMuted, fontSize: 15, flex: 1 }}>
          {selectedLabel || placeholder || "— Sélectionner —"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setOpen(false)}>
          <View style={{ flex: 1 }} />
          <Pressable
            style={{
              backgroundColor: C.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
              paddingBottom: 32, maxHeight: "70%",
            }}
            onPress={() => {}}
          >
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              margin: 16, paddingHorizontal: 12, paddingVertical: 10,
              backgroundColor: C.bgInput, borderRadius: 12,
              borderWidth: 1, borderColor: C.bgCardBorder,
            }}>
              <Ionicons name="search-outline" size={16} color={C.textMuted} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher…"
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, color: C.textPrimary, fontSize: 15 }}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 20, paddingVertical: 14,
                    backgroundColor: item.value === value ? `${C.primary}20` : "transparent",
                    borderBottomWidth: 1, borderBottomColor: C.bgCardBorder,
                  }}
                  onPress={() => { onChange(item.value); setOpen(false); setSearch(""); }}
                >
                  <Text style={{ color: item.value === value ? C.primary : C.textPrimary, fontSize: 15 }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: C.textMuted, textAlign: "center", padding: 20, fontStyle: "italic" }}>
                  Aucun résultat
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};


const METIERS = [
  { value: "analyste_credit",       label: "Analyste crédit" },
  { value: "architecte",            label: "Architecte / BTP" },
  { value: "auditeur",              label: "Auditeur" },
  { value: "banquier",              label: "Banquier / Analyste crédit" },
  { value: "charge_projets_ong",    label: "Chargé de projets ONG" },
  { value: "commercial",            label: "Commercial / Business Dev" },
  { value: "comptable",             label: "Comptable / Expert-comptable" },
  { value: "conducteur_travaux",    label: "Conducteur de travaux" },
  { value: "consultant",            label: "Consultant" },
  { value: "coordinateur_ong",      label: "Coordinateur ONG" },
  { value: "credit_officer",        label: "Credit Officer / IMF" },
  { value: "daa",                   label: "Data Analyst / BI" },
  { value: "data_scientist",        label: "Data Scientist" },
  { value: "daf",                   label: "Directeur Financier (DAF)" },
  { value: "directeur_commercial",  label: "Directeur commercial" },
  { value: "douanier",              label: "Douanier / Agent transit" },
  { value: "drh",                   label: "DRH / Responsable RH" },
  { value: "entrepreneur",          label: "Entrepreneur / CEO" },
  { value: "fiscaliste",            label: "Fiscaliste" },
  { value: "gestionnaire_rh",       label: "Gestionnaire RH / Paie" },
  { value: "ingenieur",             label: "Ingénieur / Chef de projet" },
  { value: "juriste",               label: "Juriste / Avocat" },
  { value: "medecin",               label: "Médecin / Professionnel de santé" },
  { value: "notaire",               label: "Notaire" },
  { value: "pharmacien",            label: "Pharmacien" },
  { value: "responsable_microfinance", label: "Responsable Microfinance (SFD)" },
  { value: "trader",                label: "Trader / Gestionnaire actifs" },
  { value: "transitaire",           label: "Transitaire / Commerce international" },
  { value: "autre",                 label: "Autre" },
];

const SECTEURS = [
  { value: "administration_publique", label: "Administration publique" },
  { value: "agriculture_agro",      label: "Agriculture / Agro-industrie" },
  { value: "assurance",             label: "Assurance" },
  { value: "btp_construction",      label: "BTP / Construction" },
  { value: "commerce_distribution", label: "Commerce / Distribution" },
  { value: "comptabilite_audit",    label: "Comptabilité / Audit / Fiscal" },
  { value: "education_formation",   label: "Éducation / Formation" },
  { value: "energie_mines",         label: "Énergie / Mines / Environnement" },
  { value: "finance_banque",        label: "Finance / Banque" },
  { value: "immobilier",            label: "Immobilier" },
  { value: "industrie_manufacture", label: "Industrie / Manufacture" },
  { value: "juridique_notariat",    label: "Juridique / Notariat" },
  { value: "microfinance_imf",      label: "Microfinance / IMF" },
  { value: "ong_developpement",     label: "ONG / Développement / Humanitaire" },
  { value: "recherche_conseil",     label: "Recherche / Conseil" },
  { value: "ressources_humaines",   label: "Ressources humaines" },
  { value: "sante_pharmacie",       label: "Santé / Pharmacie" },
  { value: "technologie_numerique", label: "Technologie / Numérique" },
  { value: "telecom_medias",        label: "Télécommunications / Médias" },
  { value: "tourisme_hotellerie",   label: "Tourisme / Hôtellerie" },
  { value: "transport_logistique",  label: "Transport / Logistique" },
  { value: "autre",                 label: "Autre" },
];

const PAYS = [
  "Cameroun", "Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso",
  "Guinée", "Congo", "Gabon", "RDC", "Bénin", "Togo", "Niger",
  "Tchad", "Madagascar", "Mauritanie", "Autre",
];

const XP_LEVELS = [
  { level: 1, name: "Starter", xp: 0 },
  { level: 2, name: "Praticien", xp: 500 },
  { level: 3, name: "Confirmé", xp: 1500 },
  { level: 4, name: "Expert", xp: 3000 },
  { level: 5, name: "Master", xp: 6000 },
];

export const ProfilScreen = () => {
  const { t } = useTranslation();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const { user, logout } = useAuthStore();
  const { profil, setProfil } = useProfilStore();
  const [metier, setMetier] = useState((profil as any)?.metier || "");
  const [pays, setPays] = useState((profil as any)?.pays || "");
  const [entreprise, setEntreprise] = useState((profil as any)?.entreprise || "");
  const [niveauExperience, setNiveauExperience] = useState((profil as any)?.niveau_experience || "junior");
  const [bio, setBio] = useState((profil as any)?.bio || "");

  const _secteurInitial = (profil as any)?.secteur || "";
  const _inList = SECTEURS.some((s) => s.value === _secteurInitial);
  const [secteurSelect, setSecteurSelect] = useState(_inList ? _secteurInitial : (_secteurInitial ? "autre" : ""));
  const [secteurCustom, setSecteurCustom] = useState(!_inList ? _secteurInitial : "");
  const secteur = secteurSelect === "autre" ? secteurCustom : secteurSelect;

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Photo de profil
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  useEffect(() => {
    if (!(profil as any)?.has_photo || photoUri) return;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("yukpopro_token");
        const dest = `${FileSystem.cacheDirectory}profile_photo`;
        const res = await FileSystem.downloadAsync(
          profilApi.getPhotoUrl(),
          dest,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {},
        );
        if (res.status === 200) setPhotoUri(res.uri);
      } catch { /* pas bloquant */ }
    })();
  }, [profil]);

  // Changement de mot de passe
  const [mdpModal, setMdpModal] = useState(false);
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [mdpLoading, setMdpLoading] = useState(false);
  const [showAncien, setShowAncien] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);

  const xp = (profil as any)?.xp_points || 0;
  const currentLevel = XP_LEVELS.filter((l) => l.xp <= xp).pop() || XP_LEVELS[0];
  const nextLevel = XP_LEVELS.find((l) => l.xp > xp);
  const xpProgress = nextLevel
    ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100
    : 100;

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const updated = await profilApi.update({ metier, pays, entreprise, secteur, bio, niveau_experience: niveauExperience });
      setProfil(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible de sauvegarder");
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPhotoUploading(true);
      await profilApi.uploadPhoto(asset.uri, asset.mimeType || "image/jpeg", asset.name || "photo.jpg");
      setPhotoUri(asset.uri);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible d'uploader la photo");
    } finally { setPhotoUploading(false); }
  };

  const handleDeletePhoto = () => {
    Alert.alert("Supprimer la photo", "Voulez-vous supprimer votre photo de profil ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try { await profilApi.supprimerPhoto(); setPhotoUri(null); }
        catch { Alert.alert("Erreur", "Impossible de supprimer la photo"); }
      }},
    ]);
  };

  const handleChangerMdp = async () => {
    if (nouveauMdp.length < 8) { Alert.alert("Erreur", "Minimum 8 caractères"); return; }
    if (nouveauMdp !== confirmMdp) { Alert.alert("Erreur", "Les mots de passe ne correspondent pas"); return; }
    setMdpLoading(true);
    try {
      await authApi.changerMotDePasse(ancienMdp, nouveauMdp);
      Alert.alert("Succès", "Mot de passe modifié avec succès");
      setMdpModal(false);
      setAncienMdp(""); setNouveauMdp(""); setConfirmMdp("");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Ancien mot de passe incorrect");
    } finally { setMdpLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter de YukpoPro ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await authApi.logout();
          logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        {/* Avatar cliquable */}
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={{ position: "relative" }}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {((user as any)?.nom || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            {photoUploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity onPress={handleDeletePhoto} style={{ marginTop: 4 }}>
            <Text style={{ color: C.error, fontSize: 12 }}>Supprimer la photo</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.userName}>{(user as any)?.nom || "Utilisateur"}</Text>
        <Text style={styles.userEmail}>{(user as any)?.email || ""}</Text>

        <View style={styles.xpBadge}>
          <Ionicons name="star" size={14} color={C.gold} />
          <Text style={styles.xpBadgeText}>
            Niveau {currentLevel.level} — {currentLevel.name} · {xp} XP
          </Text>
        </View>

        {nextLevel && (
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%` }]} />
            </View>
            <Text style={styles.xpBarLabel}>
              {xp} / {nextLevel.xp} XP → {nextLevel.name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(profil as any)?.nombre_requetes || 0}</Text>
          <Text style={styles.statLabel}>Requêtes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(profil as any)?.nombre_documents || 0}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{currentLevel.level}</Text>
          <Text style={styles.statLabel}>Niveau</Text>
        </View>
      </View>

      {/* Sécurité */}
      <Text style={styles.sectionTitle}>Sécurité</Text>
      <TouchableOpacity style={styles.themeRow} onPress={() => setMdpModal(true)} activeOpacity={0.7}>
        <View style={[styles.themeIconWrap, { backgroundColor: `${C.primary}20` }]}>
          <Ionicons name="lock-closed-outline" size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.themeLabel}>Modifier le mot de passe</Text>
          <Text style={styles.themeSub}>Changez votre mot de passe de connexion</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </TouchableOpacity>

      {/* Theme toggle — Apparence */}
      <Text style={styles.sectionTitle}>Apparence</Text>
      <TouchableOpacity style={styles.themeRow} onPress={toggleTheme} activeOpacity={0.7}>
        <View style={styles.themeIconWrap}>
          <Ionicons name={theme === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.themeLabel}>{theme === "dark" ? "Mode clair" : "Mode sombre"}</Text>
          <Text style={styles.themeSub}>Basculer l'apparence de l'app</Text>
        </View>
        <View style={[styles.themeSwitch, theme === "dark" && styles.themeSwitchOn]}>
          <View style={[styles.themeSwitchKnob, theme === "dark" && styles.themeSwitchKnobOn]} />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Informations professionnelles</Text>

      <ComboField
        label="Métier / Profession"
        value={metier}
        onChange={setMetier}
        options={METIERS}
        placeholder="— Rechercher votre métier —"
        C={C}
      />

      <ComboField
        label="Pays"
        value={pays}
        onChange={setPays}
        options={PAYS.map((p) => ({ value: p, label: p }))}
        placeholder="— Sélectionner votre pays —"
        C={C}
      />

      <ComboField
        label="Secteur d'activité"
        value={secteurSelect}
        onChange={setSecteurSelect}
        options={SECTEURS}
        placeholder="— Rechercher un secteur —"
        C={C}
      />
      {secteurSelect === "autre" && (
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Précisez votre secteur…"
          placeholderTextColor={C.textMuted}
          value={secteurCustom}
          onChangeText={setSecteurCustom}
        />
      )}


      <Text style={styles.label}>Entreprise / Organisation</Text>
      <TextInput
        style={styles.input}
        placeholder="Cabinet, ONG, entreprise..."
        placeholderTextColor={C.textMuted}
        value={entreprise}
        onChangeText={setEntreprise}
      />

      <Text style={styles.label}>Bio professionnelle</Text>
      <TextInput
        style={styles.bioInput}
        placeholder="Décrivez votre expertise, spécialités, contexte…"
        placeholderTextColor="#94a3b8"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Niveau d'expérience</Text>
      <View style={styles.niveauRow}>
        {[
          { value: "junior", label: "Junior" },
          { value: "senior", label: "Senior" },
          { value: "expert", label: "Expert" },
        ].map((n) => (
          <TouchableOpacity
            key={n.value}
            style={[styles.niveauBtn, niveauExperience === n.value && styles.niveauBtnActive]}
            onPress={() => setNiveauExperience(n.value)}
          >
            <Text style={[styles.niveauBtnText, niveauExperience === n.value && styles.niveauBtnTextActive]}>
              {n.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : saved ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Sauvegardé !</Text>
          </>
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Sauvegarder les modifications</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={C.error} />
        <Text style={styles.logoutBtnText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>YukpoPro v1.0 · Intelligence Professionnelle Africaine</Text>
    </ScrollView>

    {/* Modal — Changer le mot de passe */}
    <Modal visible={mdpModal} transparent animationType="slide" onRequestClose={() => setMdpModal(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setMdpModal(false)}>
        <View style={{ flex: 1 }} />
        <Pressable style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}
                   onPress={() => {}}>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>Modifier le mot de passe</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Minimum 8 caractères, une majuscule, un chiffre</Text>

          {/* Ancien mdp */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder, borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 }}>
            <TextInput secureTextEntry={!showAncien} value={ancienMdp} onChangeText={setAncienMdp}
                       placeholder="Mot de passe actuel" placeholderTextColor={C.textMuted}
                       style={{ flex: 1, color: C.textPrimary, fontSize: 15, paddingVertical: 14 }} />
            <TouchableOpacity onPress={() => setShowAncien(v => !v)}>
              <Ionicons name={showAncien ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Nouveau mdp */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.bgCardBorder, borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 }}>
            <TextInput secureTextEntry={!showNouveau} value={nouveauMdp} onChangeText={setNouveauMdp}
                       placeholder="Nouveau mot de passe" placeholderTextColor={C.textMuted}
                       style={{ flex: 1, color: C.textPrimary, fontSize: 15, paddingVertical: 14 }} />
            <TouchableOpacity onPress={() => setShowNouveau(v => !v)}>
              <Ionicons name={showNouveau ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Confirmer */}
          <View style={{ backgroundColor: C.bgInput, borderWidth: 1, borderColor: nouveauMdp && confirmMdp && nouveauMdp !== confirmMdp ? C.error : C.bgCardBorder, borderRadius: 12, paddingHorizontal: 14, marginBottom: 20 }}>
            <TextInput secureTextEntry value={confirmMdp} onChangeText={setConfirmMdp}
                       placeholder="Confirmer le nouveau mot de passe" placeholderTextColor={C.textMuted}
                       style={{ color: C.textPrimary, fontSize: 15, paddingVertical: 14 }} />
          </View>

          <TouchableOpacity
            style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", opacity: (!ancienMdp || nouveauMdp.length < 8 || nouveauMdp !== confirmMdp || mdpLoading) ? 0.4 : 1 }}
            onPress={handleChangerMdp}
            disabled={!ancienMdp || nouveauMdp.length < 8 || nouveauMdp !== confirmMdp || mdpLoading}
          >
            {mdpLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Changer le mot de passe</Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (C: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 48 },
  profileHeader: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: `${C.primary}30`,
    borderWidth: 2, borderColor: C.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  avatarPhoto: {
    width: 80, height: 80, borderRadius: 24,
    borderWidth: 2, borderColor: C.primary,
    marginBottom: 4,
  },
  cameraOverlay: {
    position: "absolute", bottom: 8, right: -8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: C.bg,
  },
  avatarText: { color: C.primary, fontSize: 36, fontWeight: "900" },
  userName: { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  userEmail: { color: C.textMuted, fontSize: 13, marginTop: 4 },
  xpBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: `${C.gold}20`,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: `${C.gold}40`,
  },
  xpBadgeText: { color: C.gold, fontSize: 13, fontWeight: "600" },
  xpBarContainer: { width: "100%", marginTop: 12 },
  xpBarBg: { height: 6, backgroundColor: C.bgCard, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", backgroundColor: C.primary, borderRadius: 3 },
  xpBarLabel: { color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  statsRow: {
    flexDirection: "row", backgroundColor: C.bgCard,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.bgCardBorder,
    marginBottom: 24,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: C.textPrimary, fontSize: 22, fontWeight: "700" },
  statLabel: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: C.bgCardBorder },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 16 },
  label: { color: C.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.bgCardBorder,
  },
  chipActive: { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  chipText: { color: C.textMuted, fontSize: 12 },
  chipTextActive: { color: C.primary, fontWeight: "600" },
  input: {
    backgroundColor: C.bgInput,
    borderWidth: 1, borderColor: C.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: C.textPrimary, fontSize: 15,
  },
  bioInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#cbd5e1",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: "#1e293b", fontSize: 15,
    minHeight: 100,
  },
  niveauRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  niveauBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: C.bgCardBorder,
    alignItems: "center",
  },
  niveauBtnActive: { backgroundColor: `${C.primary}30`, borderColor: C.primary },
  niveauBtnText: { color: C.textMuted, fontSize: 14 },
  niveauBtnTextActive: { color: C.primary, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14, paddingVertical: 16, marginTop: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: `${C.error}15`,
    borderRadius: 14, paddingVertical: 14, marginTop: 12,
    borderWidth: 1, borderColor: `${C.error}40`,
  },
  logoutBtnText: { color: C.error, fontWeight: "600", fontSize: 15 },
  version: { color: C.textMuted, fontSize: 11, textAlign: "center", marginTop: 32 },
  themeRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.bgCard,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.bgCardBorder,
    marginBottom: 24,
  },
  themeIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: `${C.primary}20`,
    alignItems: "center", justifyContent: "center",
  },
  themeLabel: { color: C.textPrimary, fontSize: 15, fontWeight: "600" },
  themeSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  themeSwitch: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: C.bgCardBorder,
    padding: 2, justifyContent: "center",
  },
  themeSwitchOn: { backgroundColor: C.primary },
  themeSwitchKnob: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#fff",
  },
  themeSwitchKnobOn: { transform: [{ translateX: 18 }] },
});
