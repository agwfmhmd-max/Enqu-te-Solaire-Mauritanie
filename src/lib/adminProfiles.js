// Liste des responsables autorisés à se connecter à l'espace d'administration.
// Chaque nom est lié à son adresse e-mail Supabase Auth ; le mot de passe est
// celui défini pour cet e-mail dans Supabase (Authentication > Users).
//
// IMPORTANT : si une adresse e-mail change, modifiez uniquement ce fichier.
// L'adresse du responsable principal (MDA) doit rester identique à celle utilisée
// dans ADMIN_SECURITY_AND_FEATURES.sql (politique de lecture du journal d'activité).

export const MAIN_ADMIN_EMAIL = "agwfmhmd@gmail.com";

export const ADMIN_PROFILES = [
  { key: "MDA", name: "MDA", email: "agwfmhmd@gmail.com", main: true },
  { key: "ELHOUSSEIN", name: "ELHOUSSEIN", email: "elhousseinainina58@gmail.com" },
  { key: "TOUTOU", name: "TOUTOU", email: "Toutoukhatri443@gmail.com" },
  { key: "NEINE", name: "NEINE", email: "mahmoudneine594@gmail.com" },
  { key: "ENCADREMENT", name: "ENCADREMENT", email: "encadrement@gmail.com" },
];

export function findAdminProfileByEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value) return null;
  return ADMIN_PROFILES.find((profile) => profile.email && profile.email.toLowerCase() === value) || null;
}

export function isMainAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
}
