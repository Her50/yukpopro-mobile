/**
 * Configuration complète des 27 métiers YukpoPro Mobile
 * Synchronisé avec yukpopro_web/src/data/metiers-config.ts
 */

export interface MetierConfig {
  label: string;
  emoji: string;
  capabilities: string[];
  agents: string[];
  suggestions: string[];
}

export const METIERS_CONFIG: Record<string, MetierConfig> = {
  comptable: {
    label: "Comptable / Expert-comptable", emoji: "🧮",
    capabilities: ["Comptabilité SYSCOHADA révisé", "Fiscalité CEMAC/UEMOA", "États financiers et clôtures"],
    agents: ["Agent Comptable", "Agent Fiscal", "Agent DAF"],
    suggestions: [
      "Génère un bilan SYSCOHADA pour une SARL",
      "Calcule l'IS et la TVA pour un CA de 150M FCFA au Cameroun",
      "Rédige les écritures de clôture d'exercice",
      "Quelles charges sont déductibles à l'IS au Sénégal ?",
    ],
  },
  fiscaliste: {
    label: "Fiscaliste", emoji: "📊",
    capabilities: ["Optimisation fiscale CEMAC/UEMOA", "Contrôles et contentieux fiscaux", "Fiscalité internationale"],
    agents: ["Agent Fiscal", "Agent Comptable", "Agent Juridique"],
    suggestions: [
      "Optimise la structure fiscale d'un groupe de sociétés au Cameroun",
      "Prépare une réponse à un redressement fiscal DGI",
      "Analyse les prix de transfert intragroupe — Art. 19 CGI",
      "Quelle TVA sur la prestation de services numériques cross-border ?",
    ],
  },
  auditeur: {
    label: "Auditeur", emoji: "🔍",
    capabilities: ["Audit légal et contractuel", "Contrôle interne COSO", "Rapports d'audit ISA"],
    agents: ["Agent Audit", "Agent Comptable", "Agent Risques"],
    suggestions: [
      "Génère un programme d'audit des immobilisations SYSCOHADA",
      "Identifie les risques d'anomalies dans ce bilan",
      "Génère un rapport d'audit interne sur les achats",
      "Rédige une lettre de mission d'audit légal",
    ],
  },
  daf: {
    label: "Directeur Financier (DAF)", emoji: "📈",
    capabilities: ["Gestion de trésorerie et cash-flow", "Reporting financier", "Stratégie financière"],
    agents: ["Agent DAF", "Agent Comptable", "Agent Stratégie"],
    suggestions: [
      "Génère un tableau de bord financier mensuel",
      "Analyse ce business plan — identifie les hypothèses fragiles",
      "Construis un plan de trésorerie sur 12 mois",
      "Évalue la rentabilité de ce projet (TRI, VAN)",
    ],
  },
  juriste: {
    label: "Juriste / Avocat", emoji: "⚖️",
    capabilities: ["Droit OHADA — Actes Uniformes", "Contentieux et arbitrage CCJA", "Droit des contrats"],
    agents: ["Agent Juridique", "Agent OHADA", "Agent Compliance"],
    suggestions: [
      "Rédige un contrat de bail commercial OHADA",
      "Génère une mise en demeure pour impayé — droit OHADA",
      "Analyse ce contrat et identifie les clauses abusives",
      "Procédure d'injonction de payer OHADA — délais et formes",
    ],
  },
  notaire: {
    label: "Notaire", emoji: "📜",
    capabilities: ["Actes authentiques OHADA", "Transactions immobilières", "Droit des successions"],
    agents: ["Agent Juridique", "Agent OHADA", "Agent Fiscal"],
    suggestions: [
      "Rédige un acte de vente immobilière conforme au droit camerounais",
      "Génère une procuration notariée pour cession de parts sociales",
      "Calcule les frais de mutation immobilière — Cameroun 2024",
      "Rédige un testament authentique conforme au Code civil",
    ],
  },
  banquier: {
    label: "Banquier / Analyste crédit", emoji: "🏦",
    capabilities: ["Analyse de crédit et scoring", "Conformité COBAC/BCEAO/BEAC", "Montage financier"],
    agents: ["Agent Bancaire", "Agent Risques", "Agent Compliance"],
    suggestions: [
      "Analyse cette demande de crédit PME — ratios de solvabilité",
      "Rédige un rapport d'analyse de crédit complet",
      "Quelles sont les normes de liquidité Bâle III en zone CEMAC ?",
      "Génère une fiche de scoring crédit pour une TPE",
    ],
  },
  analyste_credit: {
    label: "Analyste crédit", emoji: "📉",
    capabilities: ["Scoring et analyse financière", "Gestion du risque de crédit", "Portefeuille et provisionnement"],
    agents: ["Agent Bancaire", "Agent Risques", "Agent Comptable"],
    suggestions: [
      "Calcule le score de crédit de cette PME",
      "Génère un modèle de scoring à 5 critères pour TPE",
      "Rédige une note de crédit pour ce dossier de financement",
      "Quelle provision constituer sur ce crédit douteux ?",
    ],
  },
  trader: {
    label: "Trader / Gestionnaire d'actifs", emoji: "💹",
    capabilities: ["Marchés financiers Afrique — BRVM, DSX", "Gestion de portefeuille", "Analyse technique"],
    agents: ["Agent Financier", "Agent Risques", "Agent DAF"],
    suggestions: [
      "Analyse la valorisation de cette action BRVM",
      "Construis un portefeuille diversifié sur les marchés d'Afrique de l'Ouest",
      "Quelle est la réglementation CREPMF sur les OPCVM ?",
      "Quelle stratégie de couverture face à la dévaluation du FCFA ?",
    ],
  },
  drh: {
    label: "DRH / Responsable RH", emoji: "👥",
    capabilities: ["Droit social africain", "Paie et charges sociales", "Gestion des talents"],
    agents: ["Agent RH", "Agent Juridique", "Agent DAF"],
    suggestions: [
      "Rédige un contrat de travail CDI — code du travail camerounais",
      "Calcule le solde de tout compte pour ce licenciement",
      "Procédure disciplinaire — de l'avertissement au licenciement",
      "Calcule les cotisations CNPS sur cette fiche de paie",
    ],
  },
  gestionnaire_rh: {
    label: "Gestionnaire RH / Paie", emoji: "💼",
    capabilities: ["Gestion de la paie — CNPS, IRPP", "Administration du personnel", "Gestion des congés"],
    agents: ["Agent RH", "Agent Comptable", "Agent Juridique"],
    suggestions: [
      "Calcule le salaire net depuis un brut de 450 000 FCFA — Cameroun",
      "Génère un bulletin de paie complet avec toutes les cotisations",
      "Calcule l'indemnité de congés payés pour 3 ans d'ancienneté",
      "Rédige une lettre d'avertissement disciplinaire",
    ],
  },
  ingenieur: {
    label: "Ingénieur / Chef de projet", emoji: "⚙️",
    capabilities: ["Gestion de projet PMI/PRINCE2", "Rédaction technique", "Normes et réglementations BTP"],
    agents: ["Agent Technique", "Agent Stratégie", "Agent Juridique"],
    suggestions: [
      "Génère un planning de projet en WBS pour une construction",
      "Rédige une note technique pour un appel d'offres génie civil",
      "Analyse les risques techniques de ce projet",
      "Génère un rapport d'avancement de chantier",
    ],
  },
  architecte: {
    label: "Architecte / BTP", emoji: "🏗️",
    capabilities: ["Réglementation urbanisme", "Gestion de projet architectural", "Livrables techniques"],
    agents: ["Agent Technique", "Agent Juridique", "Agent DAF"],
    suggestions: [
      "Rédige un devis descriptif pour une villa de standing",
      "Génère un rapport d'expertise sur ce sinistre structurel",
      "Rédige un contrat de maîtrise d'œuvre OHADA",
      "Quelles autorisations pour un permis de construire ?",
    ],
  },
  conducteur_travaux: {
    label: "Conducteur de travaux", emoji: "🦺",
    capabilities: ["Suivi de chantier et planning", "Gestion des sous-traitants", "Contrôle qualité HSE"],
    agents: ["Agent Technique", "Agent RH", "Agent Juridique"],
    suggestions: [
      "Génère un rapport journalier de chantier",
      "Rédige une situation de travaux pour facturation",
      "Génère un PV de réception de travaux",
      "Rédige une mise en demeure à un sous-traitant défaillant",
    ],
  },
  daa: {
    label: "Data Analyst / BI", emoji: "📊",
    capabilities: ["Analyse de données et visualisation", "SQL et Python", "KPIs et tableaux de bord"],
    agents: ["Agent Data", "Agent DAF", "Agent Stratégie"],
    suggestions: [
      "Génère un script Python pour analyser ce fichier Excel",
      "Construis un tableau de bord KPIs pour une direction commerciale",
      "Détecte les anomalies dans ce jeu de données de transactions",
      "Rédige un rapport d'analyse des données de sinistralité",
    ],
  },
  data_scientist: {
    label: "Data Scientist", emoji: "🤖",
    capabilities: ["Machine Learning et modélisation", "NLP et traitement de texte", "Déploiement de modèles IA"],
    agents: ["Agent Data", "Agent Technique", "Agent Stratégie"],
    suggestions: [
      "Génère un modèle de scoring de crédit en Python — XGBoost",
      "Explique comment déployer un modèle ML sur une API FastAPI",
      "Rédige une note méthodologique pour un modèle de prédiction de churn",
      "Analyse les performances de ce modèle — matrice de confusion",
    ],
  },
  directeur_commercial: {
    label: "Directeur commercial", emoji: "🎯",
    capabilities: ["Stratégie commerciale", "Management des ventes", "Pricing et négociation"],
    agents: ["Agent Commercial", "Agent Stratégie", "Agent DAF"],
    suggestions: [
      "Génère un plan commercial annuel pour une PME",
      "Construis un tableau de bord commercial avec objectifs et pipeline",
      "Quelle stratégie de pricing pour pénétrer le marché nigérian ?",
      "Génère un rapport de performance commerciale mensuel",
    ],
  },
  commercial: {
    label: "Commercial / Business Dev", emoji: "🤝",
    capabilities: ["Prospection et négociation", "Propositions commerciales", "CRM et suivi client"],
    agents: ["Agent Commercial", "Agent Stratégie", "Agent Juridique"],
    suggestions: [
      "Rédige une proposition commerciale pour ce prospect",
      "Génère un script d'appel de prospection B2B",
      "Rédige un devis professionnel pour ce service",
      "Génère un email de relance pour une opportunité froide",
    ],
  },
  entrepreneur: {
    label: "Entrepreneur / CEO", emoji: "🚀",
    capabilities: ["Business plan et pitch deck", "Stratégie de croissance Afrique", "Levée de fonds"],
    agents: ["Agent Business", "Agent Juridique", "Agent Comptable"],
    suggestions: [
      "Génère un business plan complet pour ma startup",
      "Rédige un pitch deck de 10 slides pour des investisseurs",
      "Génère un modèle financier sur 3 ans avec hypothèses",
      "Comment structurer un tour de table seed en Afrique ?",
    ],
  },
  consultant: {
    label: "Consultant", emoji: "💡",
    capabilities: ["Livrables consulting haute qualité", "Diagnostics et études de marché", "Présentations exécutives"],
    agents: ["Agent Stratégie", "Agent Data", "Agent Juridique"],
    suggestions: [
      "Génère un rapport de diagnostic organisationnel",
      "Construis une étude de marché pour un secteur FMCG en Afrique",
      "Rédige une proposition d'intervention consulting",
      "Construis une matrice SWOT pour cette entreprise",
    ],
  },
  charge_projets_ong: {
    label: "Chargé de projets ONG", emoji: "🌍",
    capabilities: ["Rapports bailleurs", "Logframe et théorie du changement", "Budgets AFD, UE, PNUD"],
    agents: ["Agent ONG", "Agent Juridique", "Agent Comptable"],
    suggestions: [
      "Rédige un rapport narratif pour un bailleur de fonds (AFD)",
      "Construis un logframe pour ce projet de développement",
      "Génère un budget prévisionnel conforme aux règles UE",
      "Rédige une note conceptuelle pour un appel à projets",
    ],
  },
  coordinateur_ong: {
    label: "Coordinateur ONG", emoji: "🤲",
    capabilities: ["Coordination multi-acteurs", "Suivi-évaluation de projets", "Communication institutionnelle"],
    agents: ["Agent ONG", "Agent RH", "Agent Stratégie"],
    suggestions: [
      "Génère un plan de suivi-évaluation (S&E) pour ce programme",
      "Rédige un compte rendu de réunion de coordination",
      "Génère un rapport d'activités trimestriel",
      "Rédige une procédure opérationnelle standard (SOP)",
    ],
  },
  responsable_microfinance: {
    label: "Responsable Microfinance (SFD)", emoji: "💰",
    capabilities: ["Analyse de portefeuille microcrédit", "Conformité COBAC — EMF", "Gestion du risque de crédit"],
    agents: ["Agent Microfinance", "Agent Bancaire", "Agent Comptable"],
    suggestions: [
      "Calcule le PAR30 de ce portefeuille microcrédit",
      "Génère une grille de scoring adaptée aux micro-entrepreneurs",
      "Rédige un rapport de conformité COBAC trimestriel",
      "Quelle procédure de recouvrement amiable pour clients en souffrance ?",
    ],
  },
  credit_officer: {
    label: "Credit Officer / IMF", emoji: "🏘️",
    capabilities: ["Instruction des dossiers de crédit", "Visites clients et analyse terrain", "Scoring microcrédit"],
    agents: ["Agent Microfinance", "Agent Bancaire", "Agent RH"],
    suggestions: [
      "Génère une fiche d'analyse de crédit pour un petit commerçant",
      "Quelles questions poser lors d'une visite client microcrédit ?",
      "Comment évaluer les revenus informels d'un client ?",
      "Génère un plan de remboursement adapté à une activité saisonnière",
    ],
  },
  transitaire: {
    label: "Transitaire / Commerce international", emoji: "🚢",
    capabilities: ["Procédures douanières CEMAC/UEMOA", "Incoterms et documentation", "Calcul de droits et taxes"],
    agents: ["Agent Douane", "Agent Juridique", "Agent Fiscal"],
    suggestions: [
      "Calcule les droits de douane sur cette marchandise — Cameroun",
      "Quels documents pour un dédouanement import au Togo ?",
      "Explique les Incoterms 2020 — CIF vs FOB",
      "Génère une déclaration en douane provisoire",
    ],
  },
  douanier: {
    label: "Douanier / Agent transit", emoji: "🛃",
    capabilities: ["Code des Douanes CEMAC/UEMOA", "Contrôle et vérification marchandises", "Régimes douaniers"],
    agents: ["Agent Douane", "Agent Juridique", "Agent Fiscal"],
    suggestions: [
      "Quels sont les régimes douaniers suspensifs CEMAC ?",
      "Procédure de vérification des valeurs en douane — accord OMC",
      "Génère un avis de soumission pour manquant en douane",
      "Explique le système harmonisé SH — classification douanière",
    ],
  },
  medecin: {
    label: "Médecin / Professionnel de santé", emoji: "🩺",
    capabilities: ["Rédaction médicale et rapports", "Gestion administrative médicale", "Veille réglementaire santé"],
    agents: ["Agent Santé", "Agent Juridique", "Agent Comptable"],
    suggestions: [
      "Rédige un certificat médical de travail conforme",
      "Génère un rapport médical d'expertise pour une assurance",
      "Génère un business plan pour ouvrir une clinique privée",
      "Quelles normes d'accréditation pour un établissement de santé ?",
    ],
  },
  pharmacien: {
    label: "Pharmacien", emoji: "💊",
    capabilities: ["Réglementation pharmaceutique", "Gestion de pharmacie", "Conseil et documentation"],
    agents: ["Agent Santé", "Agent Juridique", "Agent Comptable"],
    suggestions: [
      "Génère un rapport d'inventaire pharmaceutique",
      "Quelles sont les règles d'importation de médicaments au Cameroun ?",
      "Quelles sont les conditions d'ouverture d'une pharmacie ?",
      "Génère un plan de gestion des produits à péremption courte",
    ],
  },
  default: {
    label: "Professionnel", emoji: "🎯",
    capabilities: ["Réponses expertes sur tous sujets professionnels africains", "Analyse de documents et données", "Rédaction de livrables métier"],
    agents: ["13 agents Yukpo spécialisés disponibles"],
    suggestions: [
      "Que peux-tu faire pour moi ?",
      "Génère-moi un rapport professionnel",
      "Analyse ce document et synthétise les points clés",
      "Traduis ce fichier en anglais professionnel",
    ],
  },
};
