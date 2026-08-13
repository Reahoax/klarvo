import { createBrowserClient } from "@supabase/ssr";

// Bruges i client components (fx login-formularen). Bruger kun den offentlige anon-nøgle,
// som er beskyttet af RLS-policies i databasen - ikke ved hemmeligholdelse.
export function opretBrowserKlient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
