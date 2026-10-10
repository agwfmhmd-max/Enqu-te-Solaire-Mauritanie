import { findAdminProfileByEmail } from "./adminProfiles";

// Enregistre une action d'un responsable dans la table admin_activity_log.
// Ne bloque jamais l'interface : toute erreur est seulement journalisée en console.
export async function logAdminActivity(supabase, action, target = "", details = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;
    const profile = findAdminProfileByEmail(user.email);
    const { error } = await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      admin_name: profile?.name || user.email || "?",
      admin_email: user.email || null,
      action,
      target: String(target || "").slice(0, 500),
      details: details || {},
    });
    if (error) console.warn("[admin-activity-log]", error.message || error);
  } catch (error) {
    console.warn("[admin-activity-log]", error?.message || error);
  }
}
