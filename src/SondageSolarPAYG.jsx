import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Calendar, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, CloudRain, Eye, EyeOff, Globe2, GripVertical, ImagePlus, Info, Languages, LockKeyhole, LogOut, Pencil, Plus, RefreshCw, Save, ShieldCheck, Sprout, Sun, Trash2, TrendingUp, UserPlus, Users, UsersRound, X, Zap } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import TeamSection from "./components/TeamSection.jsx";

const COLORS = {
  navy: "#0b1e39",
  blue: "#1b4e8c",
  sky: "#4d8ac7",
  mist: "#eaf2fb",
  ivory: "#f6f8fb",
  white: "#ffffff",
  green: "#1d8b62",
  greenSoft: "#e6f6ee",
  gold: "#b68b3c",
  ink: "#182234",
  slate: "#5b687b",
  muted: "#8793a5",
  border: "#dce4ee",
  red: "#b53b42",
  redSoft: "#fff0f1",
};

const PIE_COLORS = [COLORS.blue, COLORS.sky, COLORS.gold, COLORS.green, "#8b78b8", "#d67b55"];
const SURVEY_SLUG = "solar-payg-mauritanie-2027";
const SUBMITTED_STORAGE_KEY = `survey_submitted_${SURVEY_SLUG}`;
const ADMIN_TRIGGER_CLICKS = 5;
const ADMIN_TRIGGER_WINDOW_MS = 3000;
// Mauritania uses a fixed UTC+0 offset year-round (no daylight saving), but we
// still resolve everything through Intl with an explicit IANA zone so the
// conversion from Supabase's UTC timestamps stays correct if that ever changes.
const APP_TIMEZONE = "Africa/Nouakchott";

function localDateKeyFormatter() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
}
function localHourFormatter() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", hour12: false });
}
function toLocalDateKey(isoOrDate) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return null;
  return localDateKeyFormatter().format(date);
}
function toLocalHour(isoOrDate) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return null;
  const value = parseInt(localHourFormatter().format(date), 10);
  return Number.isNaN(value) ? 0 : value % 24;
}
function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
}
function formatDayLabel(dateKey, lang) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "fr-FR", { timeZone: "UTC", day: "2-digit", month: "short" }).format(date);
}
function formatFullDayLabel(dateKey, lang) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(date);
}

function cleanVisibleText(value) {
  return String(value || "").replace(/[?؟]/g, "").replace(/\s{2,}/g, " ").trim();
}

function normalizeForComparison(value) {
  return cleanVisibleText(value).normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase();
}

function hasStoredSubmission() {
  try { return window.localStorage.getItem(SUBMITTED_STORAGE_KEY) === "true"; } catch { return false; }
}

const T = {
  fr: {
    dir: "ltr",
    languageName: "Français",
    institute: "Institut Supérieur de Comptabilité et d’Administration des Entreprises (ISCAE)",
    kicker: "Projet de fin d’études · Banque & Assurance",
    title: "Étude de faisabilité d’une entreprise de financement PAYG de l’énergie solaire en Mauritanie",
    subtitle: "Cette enquête s’inscrit dans le cadre d’une étude académique de faisabilité visant à évaluer la viabilité commerciale, financière et opérationnelle d’une entreprise de financement PAYG de l’énergie solaire en Mauritanie, intégrant le scoring de crédit, l’assurance et le paiement mobile.",
    badge: "Projet de fin d’études — Banque & Assurance",
    duration: "Durée estimée : 4 minutes",
    questionsCount: "questions",
    start: "Commencer le questionnaire",
    intro: "Vos réponses permettront d’évaluer la demande potentielle, les besoins des utilisateurs, leur capacité de paiement et leur intérêt pour ce modèle de financement.",
    anonymous: "Les réponses sont recueillies de manière anonyme et utilisées uniquement à des fins de recherche. Aucune information personnelle identifiable n’est demandée.",
    question: "Question",
    of: "sur",
    progress: "Progression",
    required: "Obligatoire",
    optional: "Facultatif",
    next: "Suivant",
    previous: "Précédent",
    submit: "Envoyer mes réponses",
    submitting: "Envoi en cours…",
    selected: "sélectionné",
    choose: "Sélectionnez une réponse",
    textPlaceholder: "Écrivez votre réponse ici…",
    numberPlaceholder: "Votre réponse numérique",
    requiredCurrent: "Merci de répondre à cette question obligatoire avant de continuer.",
    requiredAll: "Merci de répondre à toutes les questions obligatoires avant d’envoyer.",
    loading: "Chargement de l’enquête…",
    loadingResults: "Chargement des résultats…",
    retry: "Réessayer",
    errorLoad: "Une erreur est survenue lors du chargement de l’enquête.",
    errorSubmit: "Une erreur est survenue lors de l’envoi. Veuillez réessayer.",
    duplicate: "Votre participation est déjà enregistrée. Une seule réponse est autorisée pour ce sondage.",
    alreadySubmittedTitle: "Participation déjà enregistrée",
    alreadySubmittedText: "Vous avez déjà envoyé votre réponse à ce sondage. Il n’est pas possible d’envoyer une seconde réponse.",
    thanksTitle: "Merci pour votre participation",
    thanksText: "Votre réponse a été enregistrée avec succès. Merci pour votre contribution à cette étude académique.",
    backHome: "Retour à l’accueil",
    newResponse: "Répondre à nouveau",
    submittedLock: "Votre participation est déjà enregistrée sur cet appareil. Une seule réponse est autorisée.",
    team: "Équipe",
    teamTitle: "Membres de l’équipe",
    addMember: "Ajouter un membre",
    editMember: "Modifier le membre",
    memberNameAr: "Nom en arabe",
    memberNameFr: "Nom en français",
    memberRoleAr: "Fonction en arabe",
    memberRoleFr: "Fonction en français",
    memberImage: "Photo du membre",
    imageUrl: "URL de l’image",
    uploadImage: "Téléverser une image",
    saveMember: "Enregistrer le membre",
    noMembers: "Aucun membre n’est encore configuré.",
    duplicateQuestion: "Cette question existe déjà dans le sondage.",
    duplicateOption: "Cette option existe déjà pour cette question.",
    duplicateTeamMember: "Ce membre existe déjà.",
    duplicatesFound: "Des doublons ont été détectés. Modifiez ou désactivez les éléments signalés.",
    duplicateBadge: "Doublon détecté",
    adminTitle: "Espace réservé à l’équipe du projet",
    emailLabel: "Adresse e-mail",
    passwordLabel: "Mot de passe",
    adminSubmit: "Se connecter",
    adminWrong: "Identifiants incorrects ou accès non autorisé.",
    adminBack: "Fermer",
    dashboard: "Tableau de bord",
    backSurvey: "Retour au sondage",
    signOut: "Se déconnecter",
    questions: "Questions",
    results: "Résultats",
    weather: "Météo",
    participants: "Participants",
    activeQuestions: "Questions actives",
    completion: "Taux de complétion",
    totalQuestions: "Questions au total",
    addQuestion: "Ajouter une question",
    editQuestion: "Modifier la question",
    readyQuestions: "Importer les questions académiques",
    save: "Enregistrer",
    add: "Ajouter",
    cancel: "Annuler",
    options: "Options de réponse",
    addOption: "Ajouter une option",
    questionType: "Type de question",
    singleChoice: "Choix unique",
    multipleChoice: "Choix multiples",
    text: "Réponse libre",
    number: "Nombre",
    active: "Active",
    inactive: "Inactive",
    delete: "Supprimer",
    disable: "Désactiver",
    enable: "Activer",
    moveUp: "Monter",
    moveDown: "Descendre",
    noQuestions: "Aucune question n’est encore configurée.",
    noResults: "Aucun résultat agrégé disponible.",
    noWeather: "Aucune région météo configurée.",
    addWeatherHint: "Les régions peuvent être ajoutées depuis Supabase sans modifier l’interface.",
    unknownError: "Une erreur est survenue.",
    footer: "Étude de faisabilité d’une entreprise de financement PAYG de l’énergie solaire en Mauritanie · ISCAE",
    developedBy: "Développé par MDA",
    confirmDelete: "Supprimer définitivement cette question et toutes ses options ? Les réponses historiques liées à cette question seront également supprimées.",
    yes: "Oui",
    no: "Non",
    maybe: "Peut-être",
    other: "Autre",
    stats: "Statistiques",
    statsTitle: "Statistiques des participants",
    statsSubtitle: "Suivez en temps réel la progression des réponses complétées à ce sondage.",
    participantsCompleted: "Participants ayant terminé",
    statToday: "Aujourd’hui",
    statWeek: "Cette semaine",
    statAverage: "Moyenne quotidienne",
    statBestDay: "Meilleur jour",
    rangeToday: "Aujourd’hui",
    rangeYesterday: "Hier",
    range7d: "7 derniers jours",
    range30d: "30 derniers jours",
    rangeAll: "Toutes les réponses",
    pickDate: "Sélectionner une date",
    totalCompleted: "Total complétés",
    perDayChart: "Participants complétés par jour",
    perHourChart: "Participants complétés par heure",
    evolutionChart: "Évolution des réponses",
    noStatsData: "Aucune réponse complétée pour cette période.",
    loadingStats: "Chargement des statistiques…",
    statsError: "Impossible de charger les statistiques pour le moment.",
    hourLabel: "h",
  },
  ar: {
    dir: "rtl",
    languageName: "العربية",
    institute: "المعهد العالي للمحاسبة وإدارة المؤسسات",
    kicker: "مشروع تخرج · بنوك وتأمين",
    title: "دراسة جدوى لشركة تمويل الطاقة الشمسية بالدفع المسبق (PAYG) في موريتانيا",
    subtitle: "يندرج هذا الاستبيان ضمن دراسة أكاديمية للجدوى تهدف إلى تقييم الجدوى التجارية والمالية والتشغيلية لشركة تمويل الطاقة الشمسية بالدفع المسبق (PAYG) في موريتانيا، تدمج التنقيط الائتماني والتأمين والدفع عبر المحمول.",
    badge: "مشروع تخرج — بنوك وتأمين",
    duration: "المدة التقديرية: 4 دقائق",
    questionsCount: "أسئلة",
    start: "بدء الاستبيان",
    intro: "ستتيح إجاباتكم تقييم الطلب المحتمل واحتياجات المستخدمين وقدرتهم على الدفع واهتمامهم بهذا النموذج التمويلي.",
    anonymous: "تُجمع الإجابات بشكل مجهول وتُستخدم لأغراض البحث العلمي فقط. لا نطلب أي معلومات شخصية مُعرِّفة.",
    question: "السؤال",
    of: "من",
    progress: "نسبة التقدم",
    required: "إجباري",
    optional: "اختياري",
    next: "التالي",
    previous: "السابق",
    submit: "إرسال إجاباتي",
    submitting: "جارٍ الإرسال…",
    selected: "محدد",
    choose: "اختر إجابة",
    textPlaceholder: "اكتب إجابتك هنا…",
    numberPlaceholder: "أدخل إجابة رقمية",
    requiredCurrent: "يرجى الإجابة عن هذا السؤال الإجباري قبل المتابعة.",
    requiredAll: "يرجى الإجابة عن جميع الأسئلة الإجبارية قبل الإرسال.",
    loading: "جارٍ تحميل الاستبيان…",
    loadingResults: "جارٍ تحميل النتائج…",
    retry: "إعادة المحاولة",
    errorLoad: "حدث خطأ أثناء تحميل الاستبيان.",
    errorSubmit: "حدث خطأ أثناء الإرسال. حاول مجددًا.",
    duplicate: "تم تسجيل مشاركتكم من قبل. يُسمح بإجابة واحدة فقط في هذا الاستبيان.",
    alreadySubmittedTitle: "تم تسجيل مشاركتكم مسبقًا",
    alreadySubmittedText: "لقد أرسلتم إجابتكم عن هذا الاستبيان من قبل، ولا يمكن إرسال إجابة ثانية.",
    thanksTitle: "شكرًا لمشاركتكم",
    thanksText: "تم تسجيل إجابتكم بنجاح. نشكركم على مساهمتكم في هذه الدراسة الأكاديمية.",
    backHome: "العودة إلى الصفحة الرئيسية",
    newResponse: "الإجابة مجددًا",
    submittedLock: "تم تسجيل مشاركتكم على هذا الجهاز. يُسمح بإجابة واحدة فقط.",
    team: "الفريق",
    teamTitle: "أعضاء الفريق",
    addMember: "إضافة عضو",
    editMember: "تعديل العضو",
    memberNameAr: "اسم العضو بالعربية",
    memberNameFr: "اسم العضو بالفرنسية",
    memberRoleAr: "الدور بالعربية",
    memberRoleFr: "الدور بالفرنسية",
    memberImage: "صورة العضو",
    imageUrl: "رابط الصورة",
    uploadImage: "رفع صورة",
    saveMember: "حفظ العضو",
    noMembers: "لا يوجد أعضاء مهيؤون بعد.",
    duplicateQuestion: "هذا السؤال موجود مسبقًا في الاستبيان.",
    duplicateOption: "هذا الخيار موجود مسبقًا لهذا السؤال.",
    duplicateTeamMember: "هذا العضو موجود مسبقًا.",
    duplicatesFound: "تم اكتشاف عناصر مكررة. يرجى تعديل العناصر المحددة أو تعطيلها.",
    duplicateBadge: "مكرر",
    adminTitle: "منطقة مخصصة لفريق المشروع",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    adminSubmit: "تسجيل الدخول",
    adminWrong: "بيانات الدخول غير صحيحة أو الوصول غير مصرح به.",
    adminBack: "إغلاق",
    dashboard: "لوحة المشرف",
    backSurvey: "العودة إلى الاستبيان",
    signOut: "تسجيل الخروج",
    questions: "الأسئلة",
    results: "النتائج",
    weather: "الطقس",
    participants: "المشاركون",
    activeQuestions: "الأسئلة النشطة",
    completion: "نسبة الإكمال",
    totalQuestions: "إجمالي الأسئلة",
    addQuestion: "إضافة سؤال",
    editQuestion: "تعديل السؤال",
    readyQuestions: "إدراج الأسئلة الأكاديمية الجاهزة",
    save: "حفظ",
    add: "إضافة",
    cancel: "إلغاء",
    options: "خيارات الإجابة",
    addOption: "إضافة خيار",
    questionType: "نوع السؤال",
    singleChoice: "اختيار واحد",
    multipleChoice: "اختيارات متعددة",
    text: "إجابة نصية",
    number: "رقم",
    active: "نشط",
    inactive: "غير نشط",
    delete: "حذف",
    disable: "تعطيل",
    enable: "تفعيل",
    moveUp: "تحريك للأعلى",
    moveDown: "تحريك للأسفل",
    noQuestions: "لا توجد أسئلة مُهيأة بعد.",
    noResults: "لا تتوفر نتائج مجمعة بعد.",
    noWeather: "لا توجد مناطق طقس مُهيأة.",
    addWeatherHint: "يمكن إضافة المناطق من Supabase دون تعديل الواجهة.",
    unknownError: "حدث خطأ غير متوقع.",
    footer: "دراسة جدوى شركة تمويل الطاقة الشمسية بالدفع المسبق (PAYG) في موريتانيا · المعهد العالي للمحاسبة وإدارة المؤسسات",
    developedBy: "Développé par MDA",
    confirmDelete: "هل تريد حذف هذا السؤال وجميع خياراته نهائيًا؟ سيتم حذف الإجابات التاريخية المرتبطة بهذا السؤال أيضًا.",
    yes: "نعم",
    no: "لا",
    maybe: "ربما",
    other: "آخر",
    stats: "الإحصائيات",
    statsTitle: "إحصائيات المشاركين",
    statsSubtitle: "تابع مباشرةً تطور عدد المشاركين الذين أكملوا هذا الاستبيان.",
    participantsCompleted: "المشاركون الذين أكملوا الاستبيان",
    statToday: "اليوم",
    statWeek: "هذا الأسبوع",
    statAverage: "المعدل اليومي",
    statBestDay: "أفضل يوم",
    rangeToday: "اليوم",
    rangeYesterday: "أمس",
    range7d: "آخر 7 أيام",
    range30d: "آخر 30 يومًا",
    rangeAll: "جميع الإجابات",
    pickDate: "اختر تاريخًا",
    totalCompleted: "إجمالي المكتملين",
    perDayChart: "المشاركون المكتملون حسب اليوم",
    perHourChart: "المشاركون المكتملون حسب الساعة",
    evolutionChart: "تطور عدد المشاركين",
    noStatsData: "لا توجد إجابات مكتملة خلال هذه الفترة.",
    loadingStats: "جارٍ تحميل الإحصائيات…",
    statsError: "تعذّر تحميل الإحصائيات حاليًا.",
    hourLabel: "س",
  },
};

const DEFAULT_QUESTIONS = [
  { question_ar: "كم عمرك؟", question_fr: "Quel âge avez-vous ?", question_type: "number", required: true, options: [] },
  { question_ar: "ما هو نطاق دخلك الشهري؟", question_fr: "Quelle est votre tranche de revenu mensuel ?", question_type: "single_choice", required: true, options: [["أقل من 10,000 أوقية", "Moins de 10 000 MRU", "lt_10000"], ["بين 10,000 و20,000 أوقية", "Entre 10 000 et 20 000 MRU", "10000_20000"], ["بين 20,000 و40,000 أوقية", "Entre 20 000 et 40 000 MRU", "20000_40000"], ["أكثر من 40,000 أوقية", "Plus de 40 000 MRU", "gt_40000"]] },
  { question_ar: "ما هو السعر الشهري المقبول بالنسبة لك؟", question_fr: "Quel montant mensuel serait acceptable pour vous ?", question_type: "single_choice", required: true, options: [["أقل من 1 000 أوقية", "Moins de 1 000 MRU", "lt_1000"], ["بين 1 000 و2 000 أوقية", "Entre 1 000 et 2 000 MRU", "1000_2000"], ["بين 2 000 و4 000 أوقية", "Entre 2 000 et 4 000 MRU", "2000_4000"], ["أكثر من 4 000 أوقية", "Plus de 4 000 MRU", "gt_4000"]] },
  { question_ar: "ما هو السعر الإجمالي المقبول للنظام؟", question_fr: "Quel prix total serait acceptable pour le système ?", question_type: "single_choice", required: true, options: [["أقل من 100 000 MRU", "Moins de 100 000 MRU", "lt_100000"], ["بين 100 000 و200 000 MRU", "Entre 100 000 et 200 000 MRU", "100000_200000"], ["بين 200 000 و350 000 MRU", "Entre 200 000 et 350 000 MRU", "200000_350000"], ["Plus de 350 000 MRU", "Plus de 350 000 MRU", "gt_350000"]] },
  { question_ar: "ما هو توصيفك الأقرب؟", question_fr: "Quel est votre profil principal ?", question_type: "single_choice", required: true, options: [["أسرة في منطقة ريفية", "Ménage en zone rurale", "menage_rural"], ["أسرة في منطقة حضرية أو شبه حضرية", "Ménage en zone urbaine ou périurbaine", "menage_urbain"], ["صاحب متجر أو تاجر صغير", "Commerçant ou boutiquier", "commercant"], ["مربي مواشي أو مزارع", "Éleveur ou agriculteur", "eleveur_agriculteur"], ["نشاط آخر", "Autre profil", "autre"]] },
  { question_ar: "في أي ولاية تقيم؟", question_fr: "Dans quelle wilaya résidez-vous ?", question_type: "single_choice", required: true, options: [["أدرار", "Adrar", "adrar"], ["لعصابة", "Assaba", "assaba"], ["لبراكنة", "Brakna", "brakna"], ["داخلت نواذيبو", "Dakhlet Nouadhibou", "nouadhibou"], ["كوركول", "Gorgol", "gorgol"], ["كيدي ماغا", "Guidimaka", "guidimaka"], ["الحوض الشرقي", "Hodh Ech Chargui", "hodh_chargui"], ["الحوض الغربي", "Hodh El Gharbi", "hodh_gharbi"], ["إنشيري", "Inchiri", "inchiri"], ["نواكشوط الغربية", "Nouakchott Ouest", "nouakchott_ouest"], ["نواكشوط الشمالية", "Nouakchott Nord", "nouakchott_nord"], ["نواكشوط الجنوبية", "Nouakchott Sud", "nouakchott_sud"], ["تكانت", "Tagant", "tagant"], ["تيرس زمور", "Tiris Zemmour", "tiris_zemmour"], ["ترارزة", "Trarza", "trarza"]] },
  { question_ar: "ما هو مصدر الكهرباء الرئيسي لديك حاليًا؟", question_fr: "Quelle est votre principale source d’électricité actuellement ?", question_type: "single_choice", required: true, options: [["شبكة الكهرباء العمومية بشكل منتظم", "Réseau public, accès régulier", "reseau_regulier"], ["شبكة الكهرباء مع انقطاعات متكررة", "Réseau public, coupures fréquentes", "reseau_intermittent"], ["مولد كهربائي", "Groupe électrogène", "groupe"], ["نظام شمسي قائم", "Système solaire existant", "solaire_existant"], ["لا يوجد وصول للكهرباء", "Aucun accès à l’électricité", "aucun"]] },
  { question_ar: "كم تنفق شهريًا على الطاقة (إنارة، شحن، وقود المولد)؟", question_fr: "Combien dépensez-vous par mois pour l’énergie (éclairage, recharge, carburant du groupe) ?", question_type: "single_choice", required: true, options: [["أقل من 5,000 أوقية", "Moins de 5 000 MRU", "lt_5000"], ["بين 5,000 و15,000 أوقية", "Entre 5 000 et 15 000 MRU", "5000_15000"], ["بين 15,000 و30,000 أوقية", "Entre 15 000 et 30 000 MRU", "15000_30000"], ["أكثر من 30,000 أوقية", "Plus de 30 000 MRU", "gt_30000"]] },
  { question_ar: "ما الاستخدامات التي ترغب في تشغيلها بالطاقة الشمسية؟", question_fr: "Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?", question_type: "multiple_choice", required: true, options: [["الإنارة وشحن الهواتف", "Éclairage et recharge de téléphones", "eclairage_charge"], ["التلفزيون", "Télévision", "television"], ["المروحة", "Ventilateur", "ventilateur"], ["المجمد أو الثلاجة للمتجر", "Congélateur ou réfrigérateur de commerce", "congelateur"], ["معدات إنتاجية (مضخة، ورشة)", "Équipement productif (pompe, atelier)", "productif"]] },
  { question_ar: "هل تعرف مفهوم الدفع المسبق حسب الاستهلاك (PAYG) للطاقة الشمسية؟", question_fr: "Connaissez-vous le principe du paiement à l’usage (PAYG) pour l’énergie solaire ?", question_type: "single_choice", required: true, options: [["نعم وأعرف فكرته", "Oui, j’en connais le principe", "oui_connu"], ["سمعت عنه فقط", "J’en ai seulement entendu parler", "entendu"], ["لا", "Non", "non"]] },
  { question_ar: "هل أنت مستعد لاقتناء نظام شمسي بالدفع بالتقسيط (PAYG)؟", question_fr: "Seriez-vous prêt à acquérir un kit solaire en paiement échelonné PAYG ?", question_type: "single_choice", required: true, options: [["نعم", "Oui", "oui"], ["ربما", "Peut-être", "peut_etre"], ["لا", "Non", "non"]] },
  { question_ar: "أي نظام شمسي يناسب احتياجك أكثر؟", question_fr: "Quel kit solaire correspondrait le mieux à vos besoins ?", question_type: "single_choice", required: true, options: [["نظام الإنارة والشحن (حوالي 80,000 أوقية)", "Kit éclairage et chargeur (environ 80 000 MRU)", "kit_eclairage"], ["النظام العائلي (حوالي 180,000 أوقية)", "Kit confort familial (environ 180 000 MRU)", "kit_familial"], ["النظام الإنتاجي أو التجاري (حوالي 350,000 أوقية)", "Kit productif ou commercial (environ 350 000 MRU)", "kit_productif"], ["لا يهمني أي نظام شمسي", "Aucun kit ne m’intéresse", "aucun"]] },
  { question_ar: "ما تكرار الدفع الذي تفضله؟", question_fr: "Quelle fréquence de paiement préférez-vous ?", question_type: "single_choice", required: true, options: [["يومي", "Quotidienne", "quotidienne"], ["أسبوعي", "Hebdomadaire", "hebdomadaire"], ["شهري", "Mensuelle", "mensuelle"], ["حسب مواسم الدخل", "Selon mes revenus saisonniers", "saisonniere"]] },
  { question_ar: "ما مدة التمويل الأنسب لك؟", question_fr: "Quelle durée de financement vous conviendrait le mieux ?", question_type: "single_choice", required: true, options: [["6 أشهر", "6 mois", "6_mois"], ["12 شهرًا", "12 mois", "12_mois"], ["18 شهرًا", "18 mois", "18_mois"], ["24 شهرًا", "24 mois", "24_mois"]] },
  { question_ar: "ما الدفعة المقدمة التي تستطيع تسديدها؟", question_fr: "Quel acompte initial pourriez-vous verser ?", question_type: "single_choice", required: true, options: [["أقل من 10%", "Moins de 10 %", "lt_10"], ["حوالي 10%", "Environ 10 %", "acompte_10"], ["حوالي 20%", "Environ 20 %", "acompte_20"], ["30% أو أكثر", "30 % ou plus", "gte_30"]] },
  { question_ar: "ما هي المحافظ الرقمية التي تستخدمها؟", question_fr: "Quels portefeuilles de paiement mobile utilisez-vous ?", question_type: "multiple_choice", required: true, options: [["Bankily", "Bankily", "bankily"], ["Masrivi", "Masrivi", "masrivi"], ["Sedad", "Sedad", "sedad"], ["Click", "Click", "click"], ["لا أستخدم أي محفظة (الدفع نقدًا)", "Aucun, je paie en espèces", "especes"]] },
  { question_ar: "هل تقبل الإغلاق الآلي عن بُعد للجهاز عند تأخر السداد؟", question_fr: "Accepteriez-vous le verrouillage automatique à distance de l’équipement en cas de retard de paiement ?", question_type: "single_choice", required: true, options: [["نعم", "Oui", "oui"], ["نعم مع مهلة سماح", "Oui, avec un délai de grâce", "oui_delai"], ["لا", "Non", "non"]] },
  { question_ar: "هل يهمك التأمين الأصغر المدمج ضد السرقة والعواصف الرملية والأعطال؟", question_fr: "La micro-assurance intégrée (vol, tempêtes de sable, casse) vous intéresse-t-elle ?", question_type: "single_choice", required: true, options: [["نعم", "Oui", "oui"], ["نعم إذا بقي القسط منخفضًا", "Oui, si la prime reste faible", "oui_si_prix"], ["لا", "Non", "non"]] },
  { question_ar: "ما أبرز العوائق أمام اقتناء نظام شمسي بالتقسيط؟", question_fr: "Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?", question_type: "multiple_choice", required: true, options: [["التكلفة الأولية", "Coût initial", "cout_initial"], ["ضعف الثقة في الشركة الموردة", "Manque de confiance envers le fournisseur", "confiance"], ["ضعف تغطية الشبكة", "Couverture réseau insuffisante", "reseau"], ["قلة المعرفة بالخدمة", "Méconnaissance du service", "meconnaissance"], ["الخوف من الإغلاق عن بُعد", "Crainte du verrouillage à distance", "verrouillage"], ["غياب الصيانة المحلية", "Absence de service après-vente local", "sav"]] },
  { question_ar: "ما العامل الأهم عند اختيار مزود الطاقة الشمسية؟", question_fr: "Quel facteur est le plus important dans le choix d’un fournisseur solaire ?", question_type: "single_choice", required: true, options: [["السعر", "Le prix", "prix"], ["جودة الجهاز وضمانه", "La qualité et la garantie", "qualite"], ["الصيانة المحلية بعد البيع", "Le service après-vente local", "sav"], ["مرونة الدفع", "La flexibilité de paiement", "flexibilite"]] },
  { question_ar: "ما اقتراحك أو ملاحظتك حول تمويل الطاقة الشمسية بالدفع المسبق؟", question_fr: "Quelle est votre suggestion concernant le financement solaire PAYG ?", question_type: "text", required: false, options: [] },
];

function getRespondentId() {
  const key = "survey_respondent_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

function Card({ children, className = "" }) {
  return <div className={`surface-card ${className}`}>{children}</div>;
}

function ErrorNotice({ message, onRetry, lang }) {
  const retryLabel = lang === "ar" ? "إعادة المحاولة" : "Réessayer";
  return <div className="error-notice" role="alert"><Info size={18} /><div><strong>{message}</strong><button type="button" onClick={onRetry}>{retryLabel}</button></div></div>;
}

function ChoiceCard({ option, selected, label, onClick, multiple }) {
  return <button type="button" className={`choice-card ${selected ? "is-selected" : ""}`} onClick={onClick} aria-pressed={selected}>
    <span className={`choice-indicator ${selected ? "is-selected" : ""}`}>{selected && <Check size={15} strokeWidth={3} />}</span>
    <span className="choice-label">{label}</span>
    {multiple && <span className="choice-hint">{selected ? "✓" : ""}</span>}
  </button>;
}

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-icon"><Icon size={18} /></div><div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div></div>;
}

function ResultChart({ data, emptyLabel }) {
  if (!data.length) return <div className="empty-state compact"><BarChart3 size={25} /><p>{emptyLabel}</p></div>;
  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return <div className="result-bars">{data.map((item, index) => <div className="result-bar-row" key={`${item.name}-${index}`}><div className="result-bar-label"><span>{item.name || "—"}</span><strong>{item.percentage ?? 0}%</strong></div><div className="result-bar-track"><span style={{ width: `${Math.max(4, ((Number(item.value) || 0) / maxValue) * 100)}%`, background: PIE_COLORS[index % PIE_COLORS.length] }} /></div></div>)}</div>;
}

// Lightweight, dependency-free responsive bar chart used for the participant
// statistics dashboard (daily / hourly completion counts). It renders as an
// SVG sized by viewBox so it scales fluidly, and only scrolls horizontally
// inside its own box (never the page) once there are too many bars to fit.
function TimeSeriesChart({ data, emptyLabel, height = 200, barColor = COLORS.blue }) {
  const hasData = data && data.some((item) => Number(item.value) > 0);
  if (!data || !data.length || !hasData) {
    return <div className="empty-state compact"><BarChart3 size={22} /><p>{emptyLabel}</p></div>;
  }
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  const slot = 40;
  const barWidth = 20;
  const topPad = 22;
  const bottomPad = 26;
  const chartHeight = height;
  const width = Math.max(data.length * slot, 260);
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="ts-chart" role="img" aria-label="chart" preserveAspectRatio="xMinYMid meet">
        <line x1="0" y1={chartHeight - bottomPad} x2={width} y2={chartHeight - bottomPad} stroke={COLORS.border} strokeWidth="1" />
        {data.map((item, index) => {
          const x = index * slot + (slot - barWidth) / 2;
          const usableHeight = chartHeight - topPad - bottomPad;
          const barHeight = Math.max(2, (Number(item.value) / max) * usableHeight);
          const y = chartHeight - bottomPad - barHeight;
          return (
            <g key={`${item.label}-${index}`}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={5} fill={barColor} opacity={item.value ? 1 : 0.25} />
              {item.value > 0 && <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS.ink}>{item.value}</text>}
              <text x={x + barWidth / 2} y={chartHeight - 9} textAnchor="middle" fontSize="9" fill={COLORS.muted}>{item.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const STATS_RANGE_OPTIONS = ["today", "yesterday", "7d", "30d", "all"];

function ParticipantStatsPanel({ lang, t, timestamps, loading, error, participants }) {
  const [range, setRange] = useState("7d");
  const [customDate, setCustomDate] = useState("");

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);

  const entries = useMemo(() => (timestamps || [])
    .map((iso) => ({ iso, dateKey: toLocalDateKey(iso), hour: toLocalHour(iso) }))
    .filter((entry) => entry.dateKey), [timestamps]);

  const todayCount = useMemo(() => entries.filter((entry) => entry.dateKey === todayKey).length, [entries, todayKey]);
  const weekStartKey = useMemo(() => shiftDateKey(todayKey, -6), [todayKey]);
  const weekCount = useMemo(() => entries.filter((entry) => entry.dateKey >= weekStartKey && entry.dateKey <= todayKey).length, [entries, weekStartKey, todayKey]);

  const activeDateKey = customDate || null;
  const isSingleDay = range === "today" || range === "yesterday" || !!activeDateKey;

  const rangeBounds = useMemo(() => {
    if (activeDateKey) return { start: activeDateKey, end: activeDateKey };
    if (range === "today") return { start: todayKey, end: todayKey };
    if (range === "yesterday") { const y = shiftDateKey(todayKey, -1); return { start: y, end: y }; }
    if (range === "7d") return { start: shiftDateKey(todayKey, -6), end: todayKey };
    if (range === "30d") return { start: shiftDateKey(todayKey, -29), end: todayKey };
    return { start: null, end: null };
  }, [range, todayKey, activeDateKey]);

  const filteredEntries = useMemo(() => {
    if (!rangeBounds.start) return entries;
    return entries.filter((entry) => entry.dateKey >= rangeBounds.start && entry.dateKey <= rangeBounds.end);
  }, [entries, rangeBounds]);

  const dailyCounts = useMemo(() => {
    const map = new Map();
    filteredEntries.forEach((entry) => map.set(entry.dateKey, (map.get(entry.dateKey) || 0) + 1));
    let keys;
    if (rangeBounds.start) {
      keys = [];
      let cursor = rangeBounds.start;
      while (cursor <= rangeBounds.end) { keys.push(cursor); cursor = shiftDateKey(cursor, 1); }
    } else {
      keys = Array.from(map.keys()).sort();
    }
    return keys.map((key) => ({ key, label: formatDayLabel(key, lang), value: map.get(key) || 0 }));
  }, [filteredEntries, rangeBounds, lang]);

  const hourlyCounts = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, "0")}${t.hourLabel}`, value: 0 }));
    filteredEntries.forEach((entry) => { buckets[entry.hour].value += 1; });
    return buckets;
  }, [filteredEntries, t.hourLabel]);

  const totalInRange = filteredEntries.length;
  const daysInRange = dailyCounts.length || 1;
  const dailyAverage = Math.round((totalInRange / daysInRange) * 10) / 10;
  const bestDay = dailyCounts.reduce((best, item) => (!best || item.value > best.value ? item : best), null);

  const rangeLabels = { today: t.rangeToday, yesterday: t.rangeYesterday, "7d": t.range7d, "30d": t.range30d, all: t.rangeAll };

  return (
    <div className="stats-panel">
      <div className="stats-headline-grid">
        <Card className="stats-headline-card">
          <div className="stats-headline-icon"><Users size={26} /></div>
          <div>
            <span className="eyebrow">{t.participantsCompleted}</span>
            <div className="stats-headline-value">{participants}</div>
          </div>
        </Card>
        <div className="stats-mini-grid">
          <StatCard icon={Calendar} label={t.statToday} value={todayCount} tone="green" />
          <StatCard icon={TrendingUp} label={t.statWeek} value={weekCount} tone="blue" />
          <StatCard icon={BarChart3} label={t.statAverage} value={dailyAverage} tone="gold" />
          <StatCard icon={CheckCircle2} label={t.statBestDay} value={bestDay ? `${formatDayLabel(bestDay.key, lang)} · ${bestDay.value}` : "—"} tone="navy" />
        </div>
      </div>

      <Card className="stats-toolbar-card">
        <div className="stats-toolbar">
          <div className="stats-range-pills">
            {STATS_RANGE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                className={!activeDateKey && range === option ? "is-active" : ""}
                onClick={() => { setRange(option); setCustomDate(""); }}
              >
                {rangeLabels[option]}
              </button>
            ))}
          </div>
          <label className="stats-date-picker">
            <span>{t.pickDate}</span>
            <input type="date" value={customDate} max={todayKey} onChange={(e) => setCustomDate(e.target.value)} />
          </label>
        </div>
      </Card>

      {loading && <div className="loading-state compact"><span className="spinner" />{t.loadingStats}</div>}
      {!loading && error && <div className="inline-error" role="alert"><Info size={16} />{error}</div>}

      {!loading && !error && <>
        {isSingleDay && rangeBounds.start && (
          <Card className="stats-day-summary">
            <span className="eyebrow">{formatFullDayLabel(rangeBounds.start, lang)}</span>
            <div className="stats-headline-value">{t.totalCompleted} · {totalInRange}</div>
          </Card>
        )}

        {!isSingleDay && (
          <Card>
            <h3 className="result-question">{t.perDayChart}</h3>
            <TimeSeriesChart data={dailyCounts.map((d) => ({ label: d.label, value: d.value }))} emptyLabel={t.noStatsData} barColor={COLORS.blue} />
          </Card>
        )}

        <Card>
          <h3 className="result-question">{t.perHourChart}</h3>
          <TimeSeriesChart data={hourlyCounts} emptyLabel={t.noStatsData} height={190} barColor={COLORS.green} />
        </Card>

        {!isSingleDay && dailyCounts.length > 1 && (
          <Card>
            <h3 className="result-question">{t.evolutionChart}</h3>
            <TimeSeriesChart data={dailyCounts.map((d) => ({ label: d.label, value: d.value }))} emptyLabel={t.noStatsData} barColor={COLORS.gold} />
          </Card>
        )}
      </>}
    </div>
  );
}

function AdminDashboard({ survey, questions, setQuestions, lang, t, loadResults, results, participants, handleSignOut, handleBackToSurvey, teamMembers, setTeamMembers }) {
  const [tab, setTab] = useState("stats");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [form, setForm] = useState({ question_ar: "", question_fr: "", question_type: "single_choice", required: true, active: true, options: [{ label_ar: "", label_fr: "", value: "", sort_order: 1 }] });
  const [weatherLocations, setWeatherLocations] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({ name_ar: "", name_fr: "", role_ar: "", role_fr: "", image_url: "", sort_order: 1, active: true });
  const [responseTimestamps, setResponseTimestamps] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const loadResponseTimestamps = useCallback(async () => {
    if (!survey?.id) return;
    setStatsLoading(true); setStatsError(null);
    try {
      // Only the completion timestamp is fetched (no personal data), and only
      // for the currently active survey — this stays lightweight even with a
      // large number of responses.
      const { data, error } = await supabase.from("survey_responses").select("created_at").eq("survey_id", survey.id);
      if (error) throw error;
      setResponseTimestamps((data || []).map((row) => row.created_at).filter(Boolean));
    } catch (error) {
      console.error("[survey-admin-stats]", error);
      setStatsError(error?.message || t.statsError);
    } finally { setStatsLoading(false); }
  }, [survey, t.statsError]);
  useEffect(() => { if (tab === "stats") loadResponseTimestamps(); }, [tab, loadResponseTimestamps]);

  const activeQuestions = questions.filter((q) => q.active).length;
  const duplicateQuestionIds = new Set();
  const duplicateOptionQuestionIds = new Set();
  questions.forEach((question, index) => {
    questions.slice(index + 1).forEach((other) => {
      if (normalizeForComparison(question.question_ar) === normalizeForComparison(other.question_ar) || normalizeForComparison(question.question_fr) === normalizeForComparison(other.question_fr)) { duplicateQuestionIds.add(question.id); duplicateQuestionIds.add(other.id); }
    });
    const optionLabels = (question.options || []).map((option) => `${normalizeForComparison(option.label_ar)}|${normalizeForComparison(option.label_fr)}`);
    const optionValues = (question.options || []).map((option) => normalizeForComparison(option.value));
    if (new Set(optionLabels).size !== optionLabels.length || new Set(optionValues).size !== optionValues.length) duplicateOptionQuestionIds.add(question.id);
  });
  const completionRate = participants > 0 && questions.length > 0 ? "—" : "0%";
  const resetMember = () => { setEditingMember(null); setMemberForm({ name_ar: "", name_fr: "", role_ar: "", role_fr: "", image_url: "", sort_order: teamMembers.length + 1, active: true }); };
  const reset = () => { setEditing(null); setAdminError(null); setForm({ question_ar: "", question_fr: "", question_type: "single_choice", required: true, active: true, options: [{ label_ar: "", label_fr: "", value: "", sort_order: 1 }] }); };

  const surveyId = async () => {
    if (survey?.id) return survey.id;
    const { data, error } = await supabase.from("surveys").select("id").eq("slug", SURVEY_SLUG).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error("SURVEY_NOT_FOUND");
    return data.id;
  };

  const reloadQuestions = useCallback(async () => {
    const id = await surveyId();
    const { data, error } = await supabase.from("survey_questions").select("id, question_ar, question_fr, question_type, required, active, sort_order, survey_options(id,label_ar,label_fr,value,sort_order)").eq("survey_id", id).order("sort_order", { ascending: true });
    if (error) throw error;
    setQuestions((data || []).map((q) => ({ ...q, options: (q.survey_options || []).slice().sort((a, b) => a.sort_order - b.sort_order) })));
  }, [survey, setQuestions]);

  const seedDefaultQuestions = async () => {
    setSaving(true); setAdminError(null);
    try {
      const id = await surveyId();
      const { data: existing, error } = await supabase.from("survey_questions").select("id, question_fr").eq("survey_id", id);
      if (error) throw error;
      const existingSet = new Set((existing || []).map((q) => q.question_fr.trim().toLowerCase()));
      let order = Math.max(0, ...questions.map((q) => q.sort_order || 0));
      for (const q of DEFAULT_QUESTIONS) {
        if (existingSet.has(q.question_fr.trim().toLowerCase())) continue;
        order += 1;
        const { data: inserted, error: qError } = await supabase.from("survey_questions").insert({ survey_id: id, question_ar: q.question_ar, question_fr: q.question_fr, question_type: q.question_type, required: q.required, active: true, sort_order: order }).select("id").single();
        if (qError) throw qError;
        if (q.options.length) {
          const rows = q.options.map(([label_ar, label_fr, value], index) => ({ question_id: inserted.id, label_ar, label_fr, value, sort_order: index + 1 }));
          const { error: optionsError } = await supabase.from("survey_options").insert(rows);
          if (optionsError) throw optionsError;
        }
      }
      await reloadQuestions();
    } catch (error) {
      console.error("[survey-admin-seed]", error);
      setAdminError(error?.message || t.unknownError);
    } finally { setSaving(false); }
  };

  const startEdit = (q) => { setEditing(q.id); setAdminError(null); setForm({ question_ar: q.question_ar || "", question_fr: q.question_fr || "", question_type: q.question_type, required: q.required, active: q.active, options: (q.options || []).map((o, i) => ({ ...o, sort_order: i + 1 })) }); };
  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, { label_ar: "", label_fr: "", value: "", sort_order: f.options.length + 1 }] }));
  const updateOption = (index, key, value) => setForm((f) => ({ ...f, options: f.options.map((option, optionIndex) => optionIndex === index ? { ...option, [key]: value } : option) }));
  const removeOption = (index) => setForm((f) => ({ ...f, options: f.options.filter((_, optionIndex) => optionIndex !== index).map((option, optionIndex) => ({ ...option, sort_order: optionIndex + 1 })) }));

  const saveQuestion = async () => {
    setSaving(true); setAdminError(null);
    try {
      const cleanQuestionAr = cleanVisibleText(form.question_ar);
      const cleanQuestionFr = cleanVisibleText(form.question_fr);
      if (!cleanQuestionAr || !cleanQuestionFr) throw new Error(lang === "ar" ? "يرجى إدخال نص السؤال باللغتين." : "Saisissez le texte de la question dans les deux langues.");
      const duplicateQuestion = questions.some((question) => question.id !== editing && (normalizeForComparison(question.question_ar) === normalizeForComparison(cleanQuestionAr) || normalizeForComparison(question.question_fr) === normalizeForComparison(cleanQuestionFr)));
      if (duplicateQuestion) throw new Error(t.duplicateQuestion);
      const choiceQuestion = ["single_choice", "multiple_choice"].includes(form.question_type);
      const options = form.options.filter((o) => o.label_ar?.trim() && o.label_fr?.trim() && o.value?.trim()).map((o, index) => ({ label_ar: o.label_ar.trim(), label_fr: o.label_fr.trim(), value: o.value.trim(), sort_order: index + 1 }));
      if (choiceQuestion && !options.length) throw new Error(lang === "ar" ? "أضف خيار إجابة واحدًا على الأقل." : "Ajoutez au moins une option de réponse.");
      const uniqueOptionLabels = new Set(options.map((option) => `${normalizeForComparison(option.label_ar)}|${normalizeForComparison(option.label_fr)}`));
      const uniqueOptionValues = new Set(options.map((option) => normalizeForComparison(option.value)));
      if (uniqueOptionLabels.size !== options.length || uniqueOptionValues.size !== options.length) throw new Error(t.duplicateOption);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("AUTH_REQUIRED");
      const { data: admin, error: adminErrorResponse } = await supabase.from("admins").select("id").eq("id", authData.user.id).maybeSingle();
      if (adminErrorResponse) throw adminErrorResponse;
      if (!admin) throw new Error("ADMIN_REQUIRED");
      let questionId = editing;
      if (editing) {
        const { error } = await supabase.from("survey_questions").update({ question_ar: cleanQuestionAr, question_fr: cleanQuestionFr, question_type: form.question_type, required: form.required, active: form.active }).eq("id", editing);
        if (error) throw error;
        const { error: deleteError } = await supabase.from("survey_options").delete().eq("question_id", editing);
        if (deleteError) throw deleteError;
      } else {
        const id = await surveyId();
        const maxOrder = Math.max(0, ...questions.map((q) => q.sort_order || 0));
        const { data, error } = await supabase.from("survey_questions").insert({ survey_id: id, question_ar: cleanQuestionAr, question_fr: cleanQuestionFr, question_type: form.question_type, required: form.required, active: form.active, sort_order: maxOrder + 1 }).select("id").single();
        if (error) throw error;
        questionId = data?.id;
      }
      if (choiceQuestion && options.length) {
        const { error } = await supabase.from("survey_options").insert(options.map((o) => ({ ...o, question_id: questionId })));
        if (error) throw error;
      }
      await reloadQuestions(); reset();
    } catch (error) {
      console.error("[survey-admin-save]", error);
      setAdminError(error?.message || t.unknownError);
    } finally { setSaving(false); }
  };

  const toggleQuestion = async (q) => {
    setAdminError(null);
    try {
      const { error } = await supabase.from("survey_questions").update({ active: !q.active }).eq("id", q.id);
      if (error) throw error;
      await reloadQuestions();
    } catch (error) { console.error("[survey-admin-toggle]", error); setAdminError(error?.message || t.unknownError); }
  };

  const deleteQuestion = async (q) => {
    if (!window.confirm(t.confirmDelete)) return;
    setAdminError(null);
    try {
      const { error: questionError } = await supabase.from("survey_questions").delete().eq("id", q.id);
      if (questionError) throw questionError;
      await reloadQuestions();
    } catch (error) { console.error("[survey-admin-hard-delete]", error); setAdminError(error?.message || t.unknownError); }
  };

  const moveQuestion = async (q, direction) => {
    setAdminError(null);
    try {
      const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
      const index = sorted.findIndex((item) => item.id === q.id); const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
      const current = sorted[index]; const target = sorted[targetIndex];
      const first = await supabase.from("survey_questions").update({ sort_order: target.sort_order }).eq("id", current.id);
      if (first.error) throw first.error;
      const second = await supabase.from("survey_questions").update({ sort_order: current.sort_order }).eq("id", target.id);
      if (second.error) throw second.error;
      await reloadQuestions();
    } catch (error) { console.error("[survey-admin-reorder]", error); setAdminError(error?.message || t.unknownError); }
  };

  const reloadTeamMembers = useCallback(async () => {
    const { data, error } = await supabase.from("team_members").select("id, name_ar, name_fr, role_ar, role_fr, image_url, sort_order, active").order("sort_order", { ascending: true });
    if (error) throw error;
    setTeamMembers(data || []);
  }, [setTeamMembers]);

  const startMemberEdit = (member) => {
    setEditingMember(member.id);
    setMemberForm({ name_ar: member.name_ar || "", name_fr: member.name_fr || "", role_ar: member.role_ar || "", role_fr: member.role_fr || "", image_url: member.image_url || "", sort_order: member.sort_order || 1, active: member.active !== false });
    setAdminError(null);
  };

  const uploadMemberImage = async (file) => {
    if (!file) return;
    setSaving(true); setAdminError(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("team-members").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("team-members").getPublicUrl(path);
      setMemberForm((current) => ({ ...current, image_url: data.publicUrl }));
    } catch (error) { console.error("[team-member-upload]", error); setAdminError(error?.message || t.unknownError); }
    finally { setSaving(false); }
  };

  const saveMember = async () => {
    setSaving(true); setAdminError(null);
    try {
      if (!memberForm.name_ar.trim() || !memberForm.name_fr.trim()) throw new Error(lang === "ar" ? "يرجى إدخال اسم العضو باللغتين." : "Saisissez le nom du membre dans les deux langues.");
      const duplicate = teamMembers.some((member) => member.id !== editingMember && (normalizeForComparison(member.name_ar) === normalizeForComparison(memberForm.name_ar) || normalizeForComparison(member.name_fr) === normalizeForComparison(memberForm.name_fr)));
      if (duplicate) throw new Error(t.duplicateTeamMember);
      const payload = { name_ar: memberForm.name_ar.trim(), name_fr: memberForm.name_fr.trim(), role_ar: memberForm.role_ar.trim(), role_fr: memberForm.role_fr.trim(), image_url: memberForm.image_url.trim() || null, sort_order: Number(memberForm.sort_order) || teamMembers.length + 1, active: memberForm.active };
      const response = editingMember ? await supabase.from("team_members").update(payload).eq("id", editingMember) : await supabase.from("team_members").insert(payload);
      if (response.error) throw response.error;
      await reloadTeamMembers(); resetMember();
    } catch (error) { console.error("[team-member-save]", error); setAdminError(error?.message || t.unknownError); }
    finally { setSaving(false); }
  };

  const removeMember = async (member) => {
    if (!window.confirm(lang === "ar" ? "هل تريد تعطيل هذا العضو؟" : "Désactiver ce membre ?")) return;
    setAdminError(null);
    try {
      const { error } = await supabase.from("team_members").update({ active: false }).eq("id", member.id);
      if (error) throw error;
      await reloadTeamMembers();
    } catch (error) { console.error("[team-member-delete]", error); setAdminError(error?.message || t.unknownError); }
  };

  const loadLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("weather_locations").select("*").order("wilaya");
      if (error) throw error;
      setWeatherLocations(data || []);
    } catch (error) { console.error("[survey-admin-weather]", error); setAdminError(error?.message || t.unknownError); }
  }, [t.unknownError]);
  useEffect(() => { if (tab === "weather") loadLocations(); }, [tab, loadLocations]);

  const resultGroups = questions.map((question) => ({ question, data: (results || []).filter((row) => row.question_id === question.id).map((row) => ({ name: lang === "ar" ? row.option_label_ar : row.option_label_fr, value: row.response_count, percentage: row.percentage })) }));
  useEffect(() => { if (tab === "team") reloadTeamMembers().catch((error) => { console.error("[team-members-reload]", error); setAdminError(error?.message || t.unknownError); }); }, [reloadTeamMembers, tab, t.unknownError]);
  const tabs = [["stats", t.stats], ["questions", t.questions], ["team", t.team], ["results", t.results], ["weather", t.weather]];

  return <section className="admin-shell">
    <div className="admin-heading"><div><span className="eyebrow">{t.dashboard}</span><h2>{lang === "ar" ? "إدارة المنصة والنتائج" : "Gestion de la plateforme et des résultats"}</h2><p>{survey?.title_fr || SURVEY_SLUG}</p></div><div className="admin-actions"><button type="button" className="button button-secondary" onClick={handleBackToSurvey}><ChevronLeft size={16} />{t.backSurvey}</button><button type="button" className="button button-secondary" onClick={handleSignOut}><LogOut size={16} />{t.signOut}</button></div></div>
    <div className="stats-grid"><StatCard icon={Users} label={t.participants} value={participants} tone="blue" /><StatCard icon={ClipboardList} label={t.totalQuestions} value={questions.length} tone="navy" /><StatCard icon={CheckCircle2} label={t.activeQuestions} value={activeQuestions} tone="green" /><StatCard icon={TrendingUp} label={t.completion} value={completionRate} tone="gold" /></div>
    <div className="admin-tabs" role="tablist">{tabs.map(([value, label]) => <button type="button" key={value} role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}</div>
    {adminError && <div className="admin-error"><Info size={16} />{adminError}<button type="button" onClick={() => setAdminError(null)} aria-label={t.cancel}><X size={15} /></button></div>}
    {tab === "stats" && <div className="stats-tab-wrap">
      <div className="section-title"><div className="title-icon"><BarChart3 size={18} /></div><div><span className="eyebrow">{t.stats}</span><h3>{t.statsTitle}</h3></div></div>
      <p className="stats-subtitle">{t.statsSubtitle}</p>
      <ParticipantStatsPanel lang={lang} t={t} timestamps={responseTimestamps} loading={statsLoading} error={statsError} participants={participants} />
    </div>}
    {tab === "questions" && <div className="admin-content-grid">
            <Card className="question-editor"><div className="editor-title">
<div><span className="eyebrow">{editing ? t.editQuestion : t.addQuestion}</span><h3>{editing ? t.editQuestion : t.addQuestion}</h3></div>{editing ? <button type="button" className="icon-button" onClick={reset} aria-label={t.cancel}><X size={17} /></button> : <button type="button" className="button button-quiet" onClick={seedDefaultQuestions} disabled={saving}><Sprout size={15} />{t.readyQuestions}</button>}</div>
        <div className="field-grid"><label><span>العربية</span><input value={form.question_ar} onChange={(e) => setForm({ ...form, question_ar: e.target.value })} placeholder="نص السؤال بالعربية" dir="rtl" /></label><label><span>Français</span><input value={form.question_fr} onChange={(e) => setForm({ ...form, question_fr: e.target.value })} placeholder="Texte de la question en français" /></label></div>
        <div className="field-grid three"><label><span>{t.questionType}</span><select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })}><option value="single_choice">{t.singleChoice}</option><option value="multiple_choice">{t.multipleChoice}</option><option value="text">{t.text}</option><option value="number">{t.number}</option></select></label><label className="check-field"><input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /><span>{t.required}</span></label><label className="check-field"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>{t.active}</span></label></div>
        {["single_choice", "multiple_choice"].includes(form.question_type) && <div className="option-editor"><div className="option-header"><span>{t.options}</span><button type="button" className="text-button" onClick={addOption}><Plus size={15} />{t.addOption}</button></div>{form.options.map((option, index) => <div className="option-row" key={`${index}-${option.value}`}><input value={option.label_ar} onChange={(e) => updateOption(index, "label_ar", e.target.value)} placeholder="العربية" dir="rtl" /><input value={option.label_fr} onChange={(e) => updateOption(index, "label_fr", e.target.value)} placeholder="Français" /><input value={option.value} onChange={(e) => updateOption(index, "value", e.target.value)} placeholder="value" /><button type="button" className="icon-button danger" onClick={() => removeOption(index)} aria-label={t.delete}><Trash2 size={15} /></button></div>)}</div>}
        <div className="editor-footer"><button type="button" className="button button-primary" onClick={saveQuestion} disabled={saving}><Save size={16} />{saving ? (lang === "ar" ? "جارٍ الحفظ…" : "Enregistrement…") : editing ? t.save : t.add}</button>{editing && <button type="button" className="button button-secondary" onClick={reset}>{t.cancel}</button>}</div>
            </Card>
      {(duplicateQuestionIds.size > 0 || duplicateOptionQuestionIds.size > 0) && <div className="validation-banner"><Info size={16} /><span>{t.duplicatesFound}</span></div>}
      <div className="question-list">{questions.length === 0 && <Card>
<div className="empty-state"><ClipboardList size={28} /><p>{t.noQuestions}</p></div></Card>}{questions.map((q, index) => <Card key={q.id} className={!q.active ? "is-muted" : ""}><div className="question-row"><GripVertical className="drag-icon" size={17} /><div className="question-row-copy"><span className="question-index">{String(index + 1).padStart(2, "0")}</span><strong>{cleanVisibleText(lang === "ar" ? q.question_ar : q.question_fr)}</strong><small>{q.question_type} · {q.required ? t.required : t.optional} · {q.active ? t.active : t.inactive}{(duplicateQuestionIds.has(q.id) || duplicateOptionQuestionIds.has(q.id)) && <em className="duplicate-badge">{t.duplicateBadge}</em>}</small>
</div><div className="row-actions"><button type="button" className="icon-button" onClick={() => moveQuestion(q, -1)} disabled={index === 0} aria-label={t.moveUp}><ChevronLeft className="rotate-90" size={15} /></button><button type="button" className="icon-button" onClick={() => moveQuestion(q, 1)} disabled={index === questions.length - 1} aria-label={t.moveDown}><ChevronRight className="rotate-90" size={15} /></button><button type="button" className="icon-button" onClick={() => startEdit(q)} aria-label={t.editQuestion}><Pencil size={15} /></button><button type="button" className="icon-button" onClick={() => toggleQuestion(q)} aria-label={q.active ? t.disable : t.enable}>{q.active ? <EyeOff size={15} /> : <Eye size={15} />}</button><button type="button" className="icon-button danger" onClick={() => deleteQuestion(q)} aria-label={t.delete}><Trash2 size={15} /></button></div></div></Card>)}</div>
        </div>}
    {tab === "team" && <div className="team-admin-panel">
      <Card className="member-editor"><div className="editor-title"><div><span className="eyebrow">{editingMember ? t.editMember : t.addMember}</span><h3>{editingMember ? t.editMember : t.addMember}</h3></div>{editingMember ? <button type="button" className="icon-button" onClick={resetMember} aria-label={t.cancel}><X size={17} /></button> : <UserPlus size={22} className="member-editor-mark" />}</div>
        <div className="field-grid"><label><span>{t.memberNameAr}</span><input value={memberForm.name_ar} onChange={(e) => setMemberForm({ ...memberForm, name_ar: e.target.value })} dir="rtl" placeholder="اسم العضو" /></label><label><span>{t.memberNameFr}</span><input value={memberForm.name_fr} onChange={(e) => setMemberForm({ ...memberForm, name_fr: e.target.value })} placeholder="Nom du membre" /></label></div>
        <div className="field-grid"><label><span>{t.memberRoleAr}</span><input value={memberForm.role_ar} onChange={(e) => setMemberForm({ ...memberForm, role_ar: e.target.value })} dir="rtl" placeholder="الدور أو التخصص" /></label><label><span>{t.memberRoleFr}</span><input value={memberForm.role_fr} onChange={(e) => setMemberForm({ ...memberForm, role_fr: e.target.value })} placeholder="Rôle ou spécialité" /></label></div>
        <div className="member-image-editor"><div className="member-preview">{memberForm.image_url ? <img src={memberForm.image_url} alt="" /> : <UsersRound size={28} />}</div><div className="member-image-fields"><label><span>{t.imageUrl}</span><input type="url" value={memberForm.image_url} onChange={(e) => setMemberForm({ ...memberForm, image_url: e.target.value })} placeholder="https://…" /></label><label className="file-upload-label"><span>{t.uploadImage}</span><span className="file-upload-button"><ImagePlus size={15} />{t.uploadImage}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadMemberImage(e.target.files?.[0])} /></span></label></div></div>
        <div className="field-grid three"><label><span>{lang === "ar" ? "الترتيب" : "Ordre"}</span><input type="number" min="1" value={memberForm.sort_order} onChange={(e) => setMemberForm({ ...memberForm, sort_order: e.target.value })} /></label><label className="check-field"><input type="checkbox" checked={memberForm.active} onChange={(e) => setMemberForm({ ...memberForm, active: e.target.checked })} /><span>{t.active}</span></label></div>
        <div className="editor-footer"><button type="button" className="button button-primary" onClick={saveMember} disabled={saving}><Save size={16} />{saving ? "…" : t.saveMember}</button>{editingMember && <button type="button" className="button button-secondary" onClick={resetMember}>{t.cancel}</button>}</div>
      </Card>
      <div className="team-admin-list">{teamMembers.length === 0 && <Card><div className="empty-state"><UsersRound size={28} /><p>{t.noMembers}</p></div></Card>}{teamMembers.map((member) => <Card key={member.id} className={member.active === false ? "is-muted" : ""}><div className="team-admin-row"><div className="member-mini-avatar">{member.image_url ? <img src={member.image_url} alt="" /> : <UsersRound size={18} />}</div><div className="question-row-copy"><strong>{lang === "ar" ? member.name_ar : member.name_fr}</strong><small>{(lang === "ar" ? member.role_ar : member.role_fr) || t.teamTitle} · {member.active === false ? t.inactive : t.active}</small></div><div className="row-actions"><button type="button" className="icon-button" onClick={() => startMemberEdit(member)} aria-label={t.editMember}><Pencil size={15} /></button><button type="button" className="icon-button danger" onClick={() => removeMember(member)} aria-label={t.disable}><EyeOff size={15} /></button></div></div></Card>)}</div>
    </div>}
    {tab === "results" && <div className="results-panel"><Card className="results-summary">
<div className="results-summary-icon"><BarChart3 size={22} /></div><div><span className="eyebrow">{t.results}</span><h3>{participants} {t.participants}</h3><p>{lang === "ar" ? "النتائج المعروضة مجمعة ولا تتضمن أي بيانات شخصية." : "Les résultats sont agrégés et ne contiennent aucune donnée personnelle."}</p></div><button type="button" className="button button-secondary" onClick={loadResults}><RefreshCw size={15} />{lang === "ar" ? "تحديث" : "Actualiser"}</button></Card><div className="result-grid">{resultGroups.map(({ question, data }) => <Card key={question.id}><h3 className="result-question">{cleanVisibleText(lang === "ar" ? question.question_ar : question.question_fr)}</h3><ResultChart data={data} emptyLabel={t.noResults} /></Card>)}</div></div>}
    {tab === "weather" && <Card><div className="section-title"><div className="title-icon"><CloudRain size={18} /></div><div><span className="eyebrow">{t.weather}</span><h3>{lang === "ar" ? "مناطق بيانات الطقس" : "Régions de données météo"}</h3></div></div>{weatherLocations.length === 0 ? <div className="empty-state"><CloudRain size={28} /><p>{t.noWeather}</p><small>{t.addWeatherHint}</small></div> : <div className="weather-list">{weatherLocations.map((location) => <div key={location.id} className="weather-row"><span>{location.wilaya} — {location.location_name}</span><small>{location.latitude}, {location.longitude}</small></div>)}</div>}</Card>}
  </section>;
}

export default function SondageStandalone() {
  const [lang, setLang] = useState("fr");
  const [mode, setMode] = useState("form");
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingSurvey, setLoadingSurvey] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(hasStoredSubmission);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [participants, setParticipants] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const clickTimestamps = useRef([]);
  const t = T[lang];
  const dir = t.dir;

  const qText = useCallback((q) => cleanVisibleText(lang === "ar" ? q.question_ar : q.question_fr), [lang]);
  const oText = useCallback((o) => cleanVisibleText(lang === "ar" ? o.label_ar : o.label_fr), [lang]);
  const currentQuestion = questions[currentStep];
  const requiredAnswered = useCallback((question) => {
    if (!question || !question.required) return true;
    const value = answers[question.id];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== "";
  }, [answers]);
  const allAnswered = useMemo(() => questions.every(requiredAnswered), [questions, requiredAnswered]);
  const progress = questions.length ? Math.round(((currentStep + 1) / questions.length) * 100) : 0;

  const loadSurvey = useCallback(async () => {
    setLoadingSurvey(true); setError(null);
    try {
      const { data: surveyRow, error: surveyError } = await supabase.from("surveys").select("id, slug, title_ar, title_fr, active").eq("slug", SURVEY_SLUG).eq("active", true).single();
      if (surveyError || !surveyRow) throw surveyError || new Error("SURVEY_NOT_FOUND");
      setSurvey(surveyRow);
      const respondentId = getRespondentId();
      const { data: previousResponse, error: previousResponseError } = await supabase.from("survey_responses").select("id").eq("survey_id", surveyRow.id).eq("respondent_id", respondentId).limit(1).maybeSingle();
      if (!previousResponseError && previousResponse?.id) {
        try { window.localStorage.setItem(SUBMITTED_STORAGE_KEY, "true"); } catch (storageError) { console.warn("[survey-submission-storage]", storageError); }
        setSubmitted(true);
      }
      const { data: questionRows, error: questionError } = await supabase.from("survey_questions").select("id, question_ar, question_fr, question_type, required, sort_order, survey_options(id, label_ar, label_fr, value, sort_order)").eq("survey_id", surveyRow.id).eq("active", true).order("sort_order", { ascending: true });
      if (questionError) throw questionError;
      setQuestions((questionRows || []).map((q) => ({ ...q, options: (q.survey_options || []).slice().sort((a, b) => a.sort_order - b.sort_order) })));
      setError(null);
    } catch (loadError) {
      console.error("[survey-load]", loadError);
      setError(T[lang].errorLoad);
    } finally { setLoadingSurvey(false); }
  }, [lang]);

  useEffect(() => { loadSurvey(); }, [loadSurvey]);
  const loadTeamMembers = useCallback(async () => {
    try {
      const { data, error: teamError } = await supabase.from("team_members").select("id, name_ar, name_fr, role_ar, role_fr, image_url, sort_order, active").eq("active", true).order("sort_order", { ascending: true });
      if (teamError) throw teamError;
      setTeamMembers(data || []);
    } catch (teamError) {
      // The team table is optional until the accompanying SQL is applied.
      console.warn("[team-members-load]", teamError?.message || teamError);
      setTeamMembers([]);
    }
  }, []);
  useEffect(() => { loadTeamMembers(); }, [loadTeamMembers]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = dir; document.title = t.title; }, [dir, lang, t.title]);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session ?? null); }).catch((authLoadError) => console.error("[auth-session]", authLoadError));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!session?.user) { setIsAdmin(false); return () => { cancelled = true; }; }
    supabase.from("admins").select("id").eq("id", session.user.id).maybeSingle().then(({ data, error: adminLoadError }) => { if (adminLoadError) console.error("[admin-check]", adminLoadError); if (!cancelled) setIsAdmin(!adminLoadError && !!data); }).catch((adminCheckError) => { console.error("[admin-check]", adminCheckError); if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, [session]);

  const loadResults = useCallback(async () => {
    if (!survey) return;
    try {
      const { data, error: resultsError } = await supabase.from("public_survey_results").select("*").eq("survey_id", survey.id);
      if (resultsError) throw resultsError;
      setResults(data || []);
      const { data: countData, error: countError } = await supabase.from("public_survey_participant_counts").select("total_participants").eq("survey_id", survey.id).maybeSingle();
      if (countError) console.error("[public-participant-count]", countError); else setParticipants(countData?.total_participants || 0);
    } catch (resultsError) { console.error("[survey-results]", resultsError); setError(t.errorLoad); }
  }, [survey, t.errorLoad]);
  useEffect(() => { if (mode === "results" && isAdmin) loadResults(); }, [isAdmin, loadResults, mode]);

    const updateAnswer = (questionId, value) => { setAnswers((previous) => ({ ...previous, [questionId]: value })); setError(null); };
  const markSubmissionComplete = () => { try { window.localStorage.setItem(SUBMITTED_STORAGE_KEY, "true"); } catch (storageError) { console.warn("[survey-submission-storage]", storageError); } setSubmitted(true); };
  const handleTitleClick = () => {
 const now = Date.now(); clickTimestamps.current = clickTimestamps.current.filter((timestamp) => now - timestamp < ADMIN_TRIGGER_WINDOW_MS); clickTimestamps.current.push(now); if (clickTimestamps.current.length >= ADMIN_TRIGGER_CLICKS) { clickTimestamps.current = []; setAdminPromptOpen(true); setAuthError(null); } };
  const handleNext = () => { if (!requiredAnswered(currentQuestion)) { setError(t.requiredCurrent); return; } setError(null); setCurrentStep((step) => Math.min(step + 1, questions.length - 1)); };
  const handlePrevious = () => { setError(null); setCurrentStep((step) => Math.max(step - 1, 0)); };

  const handleSubmit = async () => {
    if (!allAnswered || !survey) { setError(t.requiredAll); return; }
    setSubmitting(true); setError(null);
    try {
      const respondentId = getRespondentId();
      const responseId = crypto.randomUUID();
      const payload = questions.flatMap((q) => { const value = answers[q.id]; const values = Array.isArray(value) ? value : [value]; return values.filter((item) => item !== undefined && item !== null && String(item).trim() !== "").map((item) => { const option = q.options.find((o) => o.id === item); return { question_id: q.id, answer_value: option?.value ?? String(item), answer_text: option ? oText(option) : String(item) }; }); });
      const { data: rpcResponseId, error: rpcError } = await supabase.rpc("submit_survey_response", { p_survey_id: survey.id, p_respondent_id: respondentId, p_answers: payload });
      if (!rpcError && rpcResponseId) { markSubmissionComplete(); return; }
      if (String(rpcError?.message || "").includes("DUPLICATE_RESPONSE")) { markSubmissionComplete(); setError(t.duplicate); return; }
      const { error: responseError } = await supabase.from("survey_responses").insert({ id: responseId, survey_id: survey.id, respondent_id: respondentId });
      if (responseError) { if (String(responseError.message || "").toLowerCase().includes("duplicate")) { markSubmissionComplete(); setError(t.duplicate); return; } throw responseError; }
      const { error: answersError } = await supabase.from("survey_answers").insert(payload.map((answer) => ({ response_id: responseId, ...answer })));
      if (answersError) { await supabase.from("survey_responses").delete().eq("id", responseId); throw answersError; }
            markSubmissionComplete();
    } catch (submitError) {
 console.error("[survey-submit]", submitError); setError(String(submitError?.message || "").includes("DUPLICATE_RESPONSE") ? t.duplicate : t.errorSubmit); }
    finally { setSubmitting(false); }
  };

  const handleAdminLogin = async () => {
    setAuthBusy(true); setAuthError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.session) throw signInError || new Error("NO_SESSION");
      const { data: adminRow, error: adminErrorResponse } = await supabase.from("admins").select("id").eq("id", data.session.user.id).maybeSingle();
      if (adminErrorResponse || !adminRow) { await supabase.auth.signOut(); throw adminErrorResponse || new Error("NOT_ADMIN"); }
      setSession(data.session); setIsAdmin(true); setMode("results"); setAdminPromptOpen(false); setEmail(""); setPassword("");
    } catch (loginError) { console.error("[admin-login]", loginError); setAuthError(t.adminWrong); }
    finally { setAuthBusy(false); }
  };
  const handleSignOut = async () => { try { await supabase.auth.signOut(); } catch (signOutError) { console.error("[admin-signout]", signOutError); } setIsAdmin(false); setSession(null); setMode("form"); };

  return <div dir={dir} className="app-shell">
    <header className="site-header"><div className="header-inner"><button type="button" className="brand-button" onClick={handleTitleClick} aria-label="ISCAE"><span className="brand-mark institute-logo"><img src="/iscae-official-logo.jpeg" alt="شعار المعهد" /></span><span><strong>{t.institute}</strong><small>{t.kicker}</small></span></button><div className="header-actions"><button type="button" className="language-switcher" onClick={() => setLang((current) => current === "fr" ? "ar" : "fr")} aria-label={lang === "fr" ? "Changer la langue vers l’arabe" : "تغيير اللغة إلى الفرنسية"}><span className="language-switcher-icon"><Languages size={16} /></span><span className="language-current">{lang === "fr" ? "FR" : "AR"}</span><span className="language-next">{lang === "fr" ? "العربية" : "Français"}</span><ChevronDown size={13} /></button>{isAdmin && <button type="button" className="header-admin-button" onClick={() => setMode("results")}><BarChart3 size={15} />{t.dashboard}</button>}</div></div></header>
    <main className="page-wrap">
      {loadingSurvey && <div className="loading-state"><span className="spinner" />{t.loading}</div>}
      {!loadingSurvey && error && !currentQuestion && !submitted && <ErrorNotice message={error} onRetry={loadSurvey} lang={lang} />}
      {!loadingSurvey && error && !currentQuestion && submitted && <section className="already-submitted-screen"><div className="already-submitted-icon"><CheckCircle2 size={30} /></div><span className="eyebrow">{t.alreadySubmittedTitle}</span><h1>{t.alreadySubmittedTitle}</h1><p>{t.alreadySubmittedText}</p><div className="submission-lock"><LockKeyhole size={15} />{t.submittedLock}</div></section>}
      {!loadingSurvey && mode === "form" && !submitted && <>
        {!started && <section className="hero-section"><div className="hero-copy"><span className="academic-badge"><Sun size={15} />{t.badge}</span><h1>{t.title}</h1><p className="hero-subtitle">{t.subtitle}</p><p className="hero-intro">{t.intro}</p><div className="hero-meta"><span><ClipboardList size={16} />{questions.length} {t.questionsCount}</span><span><Zap size={16} />{t.duration}</span></div><button type="button" className="button button-primary hero-cta" disabled={!questions.length} onClick={() => { setStarted(true); setCurrentStep(0); }}>{t.start}<span className="directional-icon">{lang === "ar" ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}</span></button></div><div className="hero-visual"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-card"><div className="visual-icon project-logo-wrap"><img src="/iscae-solar-payg-logo.svg" alt="شعار فكرة المشروع" /></div><span>{lang === "ar" ? "الطاقة الشمسية PAYG" : "Énergie solaire PAYG"}</span><small>{lang === "ar" ? "الطاقة · التمويل · الدفع عبر المحمول" : "Énergie · financement · paiement mobile"}</small></div><div className="visual-pulse"><ShieldCheck size={20} /></div></div></section>}
        {started && currentQuestion && <section className="survey-flow"><div className="survey-topline"><div><span className="eyebrow">{t.question} {currentStep + 1} {t.of} {questions.length}</span><strong>{progress}%</strong></div><span>{t.progress}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><Card className="question-card"><div className="question-card-head"><span className="question-number">{String(currentStep + 1).padStart(2, "0")}</span><div><span className="question-kicker">{t.question} {currentStep + 1}</span><span className={`question-badge ${currentQuestion.required ? "required" : "optional"}`}>{currentQuestion.required ? t.required : t.optional}</span></div></div><h2>{qText(currentQuestion)}</h2>{currentQuestion.question_type === "text" && <textarea value={answers[currentQuestion.id] ?? ""} onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)} placeholder={t.textPlaceholder} rows={6} autoFocus />}{currentQuestion.question_type === "number" && <input type="number" inputMode="numeric" value={answers[currentQuestion.id] ?? ""} onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)} placeholder={t.numberPlaceholder} autoFocus />}{currentQuestion.question_type === "single_choice" && <div className="choices-grid">{currentQuestion.options.map((option) => <ChoiceCard key={option.id} option={option} selected={answers[currentQuestion.id] === option.id} label={oText(option)} onClick={() => updateAnswer(currentQuestion.id, option.id)} />)}</div>}{currentQuestion.question_type === "multiple_choice" && <div className="choices-grid">{currentQuestion.options.map((option) => { const selected = Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option.id); return <ChoiceCard key={option.id} option={option} multiple selected={selected} label={oText(option)} onClick={() => { const current = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : []; updateAnswer(currentQuestion.id, selected ? current.filter((id) => id !== option.id) : [...current, option.id]); }} />; })}</div>}{error && <div className="inline-error" role="alert"><Info size={16} />{error}</div>}</Card><div className="survey-navigation"><button type="button" className="button button-secondary" onClick={handlePrevious} disabled={currentStep === 0}><span className="directional-icon">{lang === "ar" ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</span>{t.previous}</button>{currentStep < questions.length - 1 ? <button type="button" className="button button-primary" onClick={handleNext}>{t.next}<span className="directional-icon">{lang === "ar" ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}</span></button> : <button type="button" className="button button-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? t.submitting : t.submit}<CheckCircle2 size={17} /></button>}</div><p className="privacy-note"><LockKeyhole size={14} />{t.anonymous}</p></section>}
      </>}
      {!loadingSurvey && mode === "form" && submitted && !error && <section className="success-screen"><div className="success-icon"><Check size={35} strokeWidth={3} /></div><span className="eyebrow">{lang === "ar" ? "تم الإرسال بنجاح" : "Réponse enregistrée"}</span><h1>{t.thanksTitle}</h1><p>{t.thanksText}</p><div className="submission-lock"><LockKeyhole size={15} />{t.submittedLock}</div></section>}
      {adminPromptOpen && !isAdmin && <Card className="admin-login"><div className="section-title"><div className="title-icon"><LockKeyhole size={18} /></div><div><span className="eyebrow">ISCAE</span><h2>{t.adminTitle}</h2></div><button type="button" className="icon-button" onClick={() => setAdminPromptOpen(false)} aria-label={t.adminBack}><X size={17} /></button></div><label><span>{t.emailLabel}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label><label><span>{t.passwordLabel}</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); }} autoComplete="current-password" /></label>{authError && <div className="inline-error"><Info size={16} />{authError}</div>}<div className="login-actions"><button type="button" className="button button-primary" onClick={handleAdminLogin} disabled={authBusy}>{authBusy ? "…" : t.adminSubmit}</button><button type="button" className="button button-secondary" onClick={() => setAdminPromptOpen(false)}>{t.adminBack}</button></div></Card>}
      {mode === "results" && isAdmin && <AdminDashboard survey={survey} questions={questions} setQuestions={setQuestions} lang={lang} t={t} loadResults={loadResults} results={results} participants={participants} handleSignOut={handleSignOut} handleBackToSurvey={() => setMode("form")} teamMembers={teamMembers} setTeamMembers={setTeamMembers} />}
      {mode === "form" && <TeamSection members={teamMembers} lang={lang} />}
    </main>
    <footer className="site-footer"><div className="footer-brand"><img src="/iscae-official-logo.jpeg" alt="شعار المعهد" /><span><strong>{t.institute}</strong><small>{t.footer}</small></span></div><div className="footer-credit"><span>{t.developedBy}</span><b>MDA</b></div></footer>
  </div>;
}
