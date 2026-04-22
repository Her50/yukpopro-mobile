import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/store";
import { abonnementApi } from "@/api/client";

type PlanId = "gratuit" | "starter" | "pro" | "business";
type Etape = "plans" | "operateur" | "instructions" | "confirmation" | "succes";

const PLANS = [
  {
    id: "starter" as PlanId,
    nom: "Starter",
    prix: 3000,
    credits: "5 000 crédits/mois",
    color: COLORS.primary,
    icon: "rocket-outline",
    features: ["5 000 crédits Yukpo / mois", "~40 à 60 échanges IA / mois", "Tous les agents Yukpo", "Copilote Pro", "Générateurs de rapports & slides", "Réunions & transcription"],
  },
  {
    id: "pro" as PlanId,
    nom: "Pro",
    prix: 7500,
    credits: "20 000 crédits/mois",
    color: "#8B5CF6",
    icon: "star-outline",
    badge: "Populaire",
    features: ["20 000 crédits Yukpo / mois", "~160 à 240 échanges IA / mois", "Tous les agents Yukpo", "Générateurs illimités", "Export DOCX / PPTX", "Support prioritaire"],
  },
  {
    id: "business" as PlanId,
    nom: "Business",
    prix: 20000,
    credits: "Illimité",
    color: COLORS.gold,
    icon: "diamond-outline",
    features: ["Crédits Yukpo illimités", "Aucune restriction d'usage", "Tous les agents Yukpo", "Accès API", "Multi-utilisateurs", "WhatsApp intégré", "Support dédié"],
  },
];

const OPERATEURS = [
  { id: "orange_money",  label: "Orange Money",  logo: "https://logo.clearbit.com/orange.com" },
  { id: "mtn_momo",     label: "MTN MoMo",       logo: "https://logo.clearbit.com/mtn.com" },
  { id: "wave",         label: "Wave",            logo: "https://logo.clearbit.com/wave.com" },
  { id: "moov_money",   label: "Moov Money",      logo: "https://logo.clearbit.com/moov-africa.com" },
  { id: "airtel_money", label: "Airtel Money",    logo: "https://logo.clearbit.com/airtel.com" },
  { id: "expressunion", label: "Express Union",   logo: "https://logo.clearbit.com/expressunion.cm" },
];

export const AbonnementScreen = () => {
  const [abonnement, setAbonnement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [etape, setEtape] = useState<Etape>("plans");
  const [planChoisi, setPlanChoisi] = useState<PlanId | null>(null);
  const [operateur, setOperateur] = useState("");
  const [telephone, setTelephone] = useState("");
  const [instructions, setInstructions] = useState<any>(null);
  const [reference, setReference] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── Recharge crédits ────────────────────────────────────────────────────────
  const [modeRecharge, setModeRecharge]   = useState(false);
  const [etapeR, setEtapeR]               = useState<"packs"|"operateur"|"instructions"|"confirmation"|"succes">("packs");
  const [packChoisi, setPackChoisi]       = useState("");
  const [operateurR, setOperateurR]       = useState("");
  const [telephoneR, setTelephoneR]       = useState("");
  const [instrR, setInstrR]               = useState<any>(null);
  const [refR, setRefR]                   = useState("");
  const [txIdR, setTxIdR]                 = useState("");
  const [loadingR, setLoadingR]           = useState(false);

  const PACKS = [
    { id: "pack_500",   nom: "500 crédits",    prix: 300,  badge: "" },
    { id: "pack_2000",  nom: "2 000 crédits",  prix: 1200, badge: "Populaire" },
    { id: "pack_5000",  nom: "5 000 crédits",  prix: 3000, badge: "Meilleur prix" },
    { id: "pack_15000", nom: "15 000 crédits", prix: 9000, badge: "" },
  ];

  const handleInitierRecharge = async () => {
    if (!packChoisi || !operateurR || telephoneR.length < 8) {
      Alert.alert("Champs requis", "Remplissez tous les champs"); return;
    }
    setLoadingR(true);
    try {
      const res = await abonnementApi.initierRecharge({ pack_id: packChoisi, operateur: operateurR, numero_telephone: telephoneR, pays: "CM" });
      setInstrR(res);
      setRefR(res.reference || "");
      setEtapeR("instructions");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible d'initier la recharge");
    } finally { setLoadingR(false); }
  };

  const handleConfirmerRecharge = async () => {
    if (!refR) { Alert.alert("Erreur", "Référence manquante"); return; }
    setLoadingR(true);
    try {
      await abonnementApi.confirmerRecharge(refR, txIdR || undefined);
      setEtapeR("succes");
      const a = await abonnementApi.monAbonnement();
      setAbonnement(a);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Référence invalide");
    } finally { setLoadingR(false); }
  };

  useEffect(() => {
    abonnementApi.monAbonnement()
      .then(setAbonnement)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleInitier = async () => {
    if (!planChoisi || !operateur || telephone.length < 8) {
      Alert.alert("Champs requis", "Veuillez remplir tous les champs");
      return;
    }
    setActionLoading(true);
    try {
      const res = await abonnementApi.initierPaiement({
        plan: planChoisi,
        operateur,
        numero_telephone: telephone,
        pays: "CM",
      });
      setInstructions(res);
      setReference(res.reference || "");
      setEtape("instructions");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible d'initier le paiement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmer = async () => {
    if (!reference) { Alert.alert("Erreur", "Référence manquante"); return; }
    setActionLoading(true);
    try {
      await abonnementApi.confirmerPaiement(reference, transactionId || undefined);
      setEtape("succes");
      const a = await abonnementApi.monAbonnement();
      setAbonnement(a);
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Référence invalide ou expirée");
    } finally {
      setActionLoading(false);
    }
  };

  const copierReference = () => {
    Clipboard.setString(reference);
    Alert.alert("Copié", `Référence ${reference} copiée`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.title}>Abonnement</Text>
      <Text style={styles.subtitle}>Accédez à tous les agents selon votre plan</Text>

      {/* Abonnement actuel */}
      {abonnement && (
        <View style={styles.abonnementCard}>
          <View style={styles.abonnementRow}>
            <View>
              <Text style={styles.planActuelLabel}>Plan actuel</Text>
              <Text style={styles.planActuelNom}>{abonnement.nom_plan || "Gratuit"}</Text>
            </View>
            <View style={styles.quotaBox}>
              <Text style={styles.quotaValue}>
                {(abonnement.credits_restants ?? abonnement.requetes_restantes ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.quotaLabel}>crédits restants</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[
              styles.progressFill,
              {
                width: `${Math.min(100, abonnement.pct_utilise ?? Math.round(((abonnement.credits_utilises || abonnement.requetes_utilisees || 0) / Math.max(abonnement.credits_alloues || abonnement.quota_jour || 1, 1)) * 100))}%`,
                backgroundColor: (abonnement.pct_utilise ?? 0) > 85 ? COLORS.error : (abonnement.pct_utilise ?? 0) > 60 ? COLORS.warning : COLORS.primary,
              } as any,
            ]} />
          </View>
          <Text style={styles.progressLabel}>
            {(abonnement.credits_utilises ?? abonnement.requetes_utilisees ?? 0).toLocaleString()} / {(abonnement.credits_alloues ?? abonnement.quota_jour ?? 0).toLocaleString()} crédits utilisés
            {abonnement.renouvellement_le ? `  ·  Renouvellement ${new Date(abonnement.renouvellement_le).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}` : ""}
          </Text>
          {abonnement.explication_credits && (
            <Text style={[styles.progressLabel, { marginTop: 4, color: COLORS.textMuted, fontSize: 10 }]}>
              {abonnement.explication_credits}
            </Text>
          )}
        </View>
      )}

      {/* ── Recharge crédits ── */}
      {!modeRecharge ? (
        <TouchableOpacity style={styles.rechargeBtn} onPress={() => { setModeRecharge(true); setEtapeR("packs"); }}>
          <View>
            <Text style={styles.rechargeBtnTitle}>Recharger des crédits</Text>
            <Text style={styles.rechargeBtnSub}>Acheter des crédits sans changer de plan · 0,6 FCFA / crédit</Text>
          </View>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.rechargePanel}>
          <View style={styles.rechargePanelHeader}>
            <Text style={styles.rechargePanelTitle}>Recharger des crédits</Text>
            <TouchableOpacity onPress={() => { setModeRecharge(false); setEtapeR("packs"); }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Annuler</Text>
            </TouchableOpacity>
          </View>

          {etapeR === "packs" && (
            <>
              <Text style={styles.label}>Choisissez un pack :</Text>
              <View style={styles.packsGrid}>
                {PACKS.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => setPackChoisi(p.id)}
                    style={[styles.packCard, packChoisi === p.id && styles.packCardActive]}>
                    {p.badge ? <Text style={styles.packBadge}>{p.badge}</Text> : null}
                    <Text style={styles.packNom}>{p.nom}</Text>
                    <Text style={styles.packPrix}>{p.prix.toLocaleString()} FCFA</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.btnPrimary, !packChoisi && styles.btnDisabled]} disabled={!packChoisi} onPress={() => setEtapeR("operateur")}>
                <Text style={styles.btnPrimaryText}>Continuer</Text>
              </TouchableOpacity>
            </>
          )}

          {etapeR === "operateur" && (
            <>
              <Text style={styles.label}>Opérateur Mobile Money :</Text>
              <View style={styles.opsGrid}>
                {OPERATEURS.map((op) => (
                  <TouchableOpacity key={op.id} onPress={() => setOperateurR(op.id)}
                    style={[styles.opCard, operateurR === op.id && styles.opCardActive]}>
                    <Image source={{ uri: op.logo }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff" }} />
                    <Text style={[styles.opLabel, operateurR === op.id && { color: "#fff" }]}>{op.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput placeholder="Numéro Mobile Money" value={telephoneR} onChangeText={(t) => setTelephoneR(t.replace(/\D/g, ""))}
                keyboardType="phone-pad" style={styles.input} placeholderTextColor={COLORS.textMuted} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setEtapeR("packs")}>
                  <Text style={styles.btnSecondaryText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 2 }, (!operateurR || telephoneR.length < 8) && styles.btnDisabled]}
                  disabled={!operateurR || telephoneR.length < 8 || loadingR} onPress={handleInitierRecharge}>
                  {loadingR ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Recevoir instructions</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {etapeR === "instructions" && instrR && (
            <>
              <View style={styles.refBox}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Référence de recharge</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={styles.refCode}>{refR}</Text>
                  <TouchableOpacity onPress={() => { Clipboard.setString(refR); Alert.alert("Copié", refR); }}>
                    <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.montantLine}>Montant : {instrR.montant_fcfa?.toLocaleString()} FCFA</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setEtapeR("confirmation")}>
                <Text style={styles.btnPrimaryText}>J'ai effectué le paiement</Text>
              </TouchableOpacity>
            </>
          )}

          {etapeR === "confirmation" && (
            <>
              <TextInput placeholder="YKP-RC-XXXXXXXX" value={refR} onChangeText={(t) => setRefR(t.toUpperCase())}
                style={styles.input} placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" />
              <TextInput placeholder="ID Transaction (optionnel)" value={txIdR} onChangeText={setTxIdR}
                style={[styles.input, { marginTop: 8 }]} placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={[styles.btnPrimary, !refR && styles.btnDisabled]} disabled={!refR || loadingR} onPress={handleConfirmerRecharge}>
                {loadingR ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Confirmer la recharge</Text>}
              </TouchableOpacity>
            </>
          )}

          {etapeR === "succes" && (
            <View style={{ alignItems: "center", paddingVertical: 20, gap: 12 }}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.success || "#22c55e"} />
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>Crédits ajoutés !</Text>
              <Text style={{ color: COLORS.textMuted, textAlign: "center" }}>Vos crédits sont immédiatement disponibles.</Text>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => { setModeRecharge(false); setEtapeR("packs"); setPackChoisi(""); setOperateurR(""); setTelephoneR(""); }}>
                <Text style={styles.btnSecondaryText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Plans ── */}
      {etape === "plans" && (
        <>
          <Text style={styles.sectionTitle}>Choisir un plan</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, { borderColor: `${plan.color}50` }]}
              onPress={() => { setPlanChoisi(plan.id); setEtape("operateur"); }}
            >
              {plan.badge && (
                <View style={[styles.badge, { backgroundColor: plan.color }]}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: `${plan.color}25` }]}>
                  <Ionicons name={plan.icon as any} size={20} color={plan.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planNom}>{plan.nom}</Text>
                  <Text style={styles.planQuota}>{plan.credits}</Text>
                </View>
                <View style={styles.planPrix}>
                  <Text style={[styles.planPrixVal, { color: plan.color }]}>{plan.prix.toLocaleString()}</Text>
                  <Text style={styles.planPrixDevise}>FCFA/mois</Text>
                </View>
              </View>
              <View style={styles.featuresList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.choisirBtn, { backgroundColor: `${plan.color}20`, borderColor: `${plan.color}40` }]}>
                <Text style={[styles.choisirBtnText, { color: plan.color }]}>Souscrire à ce plan</Text>
                <Ionicons name="arrow-forward" size={14} color={plan.color} />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ── Opérateur ── */}
      {etape === "operateur" && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>Mode de paiement</Text>
          <Text style={styles.stepSubtitle}>
            Plan {PLANS.find(p => p.id === planChoisi)?.nom} — {PLANS.find(p => p.id === planChoisi)?.prix.toLocaleString()} FCFA/mois
          </Text>

          <Text style={styles.fieldLabel}>Opérateur Mobile Money</Text>
          <View style={styles.operateurGrid}>
            {OPERATEURS.map((op) => (
              <TouchableOpacity
                key={op.id}
                style={[styles.operateurChip, operateur === op.id && styles.operateurChipActive]}
                onPress={() => setOperateur(op.id)}
              >
                <Image source={{ uri: op.logo }} style={styles.operateurLogo} />
                <Text style={[styles.operateurLabel, operateur === op.id && styles.operateurLabelActive]}>
                  {op.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
          <View style={styles.telRow}>
            <View style={styles.indicatif}><Text style={styles.indicatifText}>+237</Text></View>
            <TextInput
              style={styles.telInput}
              placeholder="6XX XXX XXX"
              placeholderTextColor={COLORS.textMuted}
              value={telephone}
              onChangeText={(t) => setTelephone(t.replace(/\D/g, ""))}
              keyboardType="phone-pad"
              maxLength={9}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setEtape("plans")}>
              <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, (!operateur || telephone.length < 8) && styles.btnDisabled]}
              onPress={handleInitier}
              disabled={!operateur || telephone.length < 8 || actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="phone-portrait-outline" size={16} color="#fff" />
                  <Text style={styles.nextBtnText}>Recevoir instructions</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Instructions ── */}
      {etape === "instructions" && instructions && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>Instructions de paiement</Text>

          <View style={styles.referenceBox}>
            <Text style={styles.referenceLabel}>Votre référence</Text>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceCode}>{reference}</Text>
              <TouchableOpacity onPress={copierReference} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.montantRow}>
            <Text style={styles.montantLabel}>Montant</Text>
            <Text style={styles.montantVal}>{instructions.montant_fcfa?.toLocaleString()} FCFA</Text>
          </View>

          {instructions.instructions?.etapes && Object.entries(instructions.instructions.etapes).map(([key, val]) => (
            <View key={key} style={styles.instructionItem}>
              <Text style={styles.instructionKey}>{key}</Text>
              <Text style={styles.instructionVal}>{val as string}</Text>
            </View>
          ))}

          <View style={styles.alertBox}>
            <Ionicons name="warning-outline" size={16} color={COLORS.gold} />
            <Text style={styles.alertText}>
              Conservez la référence <Text style={{ color: COLORS.gold, fontWeight: "700" }}>{reference}</Text> pour confirmer votre abonnement.
            </Text>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={() => setEtape("confirmation")}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.nextBtnText}>J'ai effectué le paiement</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Confirmation ── */}
      {etape === "confirmation" && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>Confirmer le paiement</Text>

          <Text style={styles.fieldLabel}>Référence de paiement *</Text>
          <TextInput
            style={[styles.input, styles.monoInput]}
            placeholder="YKP-XXXXXXXX"
            placeholderTextColor={COLORS.textMuted}
            value={reference}
            onChangeText={(t) => setReference(t.toUpperCase())}
            autoCapitalize="characters"
          />

          <Text style={styles.fieldLabel}>ID Transaction Mobile Money (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Numéro reçu par SMS"
            placeholderTextColor={COLORS.textMuted}
            value={transactionId}
            onChangeText={setTransactionId}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setEtape("instructions")}>
              <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !reference && styles.btnDisabled]}
              onPress={handleConfirmer}
              disabled={!reference || actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.nextBtnText}>Activer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Succès ── */}
      {etape === "succes" && (
        <View style={[styles.stepCard, { alignItems: "center" }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Abonnement activé !</Text>
          <Text style={styles.successSub}>
            Votre plan {PLANS.find(p => p.id === planChoisi)?.nom} est maintenant actif. Profitez de tous les agents Yukpo Pro.
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={() => setEtape("plans")}>
            <Text style={styles.nextBtnText}>Retour aux plans</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20 },
  abonnementCard: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    marginBottom: 20,
  },
  abonnementRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  planActuelLabel: { color: COLORS.textMuted, fontSize: 12 },
  planActuelNom: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
  quotaBox: { alignItems: "flex-end" },
  quotaValue: { color: COLORS.primary, fontSize: 24, fontWeight: "700" },
  quotaLabel: { color: COLORS.textMuted, fontSize: 11 },
  progressBg: { height: 6, backgroundColor: COLORS.bgCardBorder, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 3 },
  progressLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  planCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  planIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planNom: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "700" },
  planQuota: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  planPrix: { alignItems: "flex-end" },
  planPrixVal: { fontSize: 20, fontWeight: "800" },
  planPrixDevise: { color: COLORS.textMuted, fontSize: 11 },
  featuresList: { gap: 6, marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: COLORS.textSecondary, fontSize: 13 },
  choisirBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  choisirBtnText: { fontSize: 14, fontWeight: "600" },
  stepCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    gap: 14,
  },
  stepTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
  stepSubtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: -8 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
  operateurGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  operateurChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
  },
  operateurChipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  operateurLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff" },
  operateurLabel: { color: COLORS.textMuted, fontSize: 12 },
  operateurLabelActive: { color: COLORS.primary, fontWeight: "600" },
  telRow: { flexDirection: "row", gap: 8 },
  indicatif: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  indicatifText: { color: COLORS.textMuted, fontSize: 14 },
  telInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
  },
  backBtnText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 14 },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  referenceBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  referenceLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 6 },
  referenceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  referenceCode: { color: COLORS.primary, fontSize: 22, fontWeight: "800", letterSpacing: 2 },
  copyBtn: { padding: 6 },
  montantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  montantLabel: { color: COLORS.textMuted, fontSize: 13 },
  montantVal: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  instructionItem: { flexDirection: "row", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.bgCardBorder },
  instructionKey: { color: COLORS.primary, fontSize: 12, fontWeight: "700", width: 60 },
  instructionVal: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  alertBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: `${COLORS.gold}15`,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.gold}30`,
  },
  alertText: { color: COLORS.gold, fontSize: 12, flex: 1 },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: COLORS.bgCardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  monoInput: { letterSpacing: 2, fontWeight: "700" },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${COLORS.success}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700" },
  successSub: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },

  // ── Recharge crédits ──
  rechargeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4,
  },
  rechargeBtnTitle: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 15 },
  rechargeBtnSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  rechargePanel: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: `${COLORS.primary}40`,
    borderRadius: 16, padding: 16, gap: 14, marginBottom: 4,
  },
  rechargePanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rechargePanelTitle: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 16 },
  label: { color: COLORS.textSecondary, fontSize: 13 },
  packsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  packCard: {
    flex: 1, minWidth: "45%", borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 12, padding: 12, alignItems: "center",
  },
  packCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  packBadge: {
    backgroundColor: COLORS.primary, color: "#fff", fontSize: 9, fontWeight: "700",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 4,
  },
  packNom: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 14, textAlign: "center" },
  packPrix: { color: COLORS.primary, fontWeight: "600", fontSize: 13, marginTop: 4 },
  opsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opCard: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 10,
    borderWidth: 1, borderColor: COLORS.bgCardBorder, borderRadius: 10, minWidth: "47%",
  },
  opCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  opLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "#0F172A", borderWidth: 1, borderColor: COLORS.bgCardBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.textPrimary, fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13,
    alignItems: "center", justifyContent: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnSecondary: {
    borderWidth: 1, borderColor: COLORS.bgCardBorder, borderRadius: 12,
    paddingVertical: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  btnSecondaryText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 14 },
  refBox: {
    backgroundColor: "#0F172A", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  refCode: { color: COLORS.primary, fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  montantLine: { color: COLORS.textSecondary, fontSize: 14 },
});
