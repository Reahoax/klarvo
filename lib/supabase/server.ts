import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieTilOpdatering = {
  name: string;
  value: string;
  options: CookieOptions;
};

// Bruges i server components, server actions og middleware. Læser/skriver auth-cookien,
// så login-status følger brugeren mellem sider uden at gemme noget i localStorage.
export async function opretServerKlient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesTilOpdatering: CookieTilOpdatering[]) {
          try {
            cookiesTilOpdatering.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Kan ikke sætte cookies fra en Server Component - det er forventet,
            // middleware.ts sørger for at sessionen alligevel forlænges.
          }
        },
      },
    }
  );
}
