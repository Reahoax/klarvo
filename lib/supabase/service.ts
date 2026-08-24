import { createClient } from "@supabase/supabase-js";

// Kun til brug i baggrundsjob uden nogen indlogget bruger (fx cron-routen for
// automatisk CVR-import) - service role-nøglen omgår RLS fuldstændigt, så
// den må ALDRIG eksponeres til klienten eller bruges i almindelige
// server actions, hvor opretServerKlient() (cookie/session-baseret) er det
// rigtige valg. SUPABASE_SERVICE_ROLE_KEY findes i Supabase-dashboardet →
// Settings → API Keys → "Secret keys" (Supabase har udfaset det ældre navn
// "service_role" til fordel for dette, samme funktion) og skal sættes som
// miljøvariabel i Vercel, aldrig committes.
export function opretServiceKlient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler som miljøvariabel.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
