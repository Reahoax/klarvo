import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieTilOpdatering = {
  name: string;
  value: string;
  options: CookieOptions;
};

// Beskytter alle sider undtagen /login. Uden gyldig session sendes brugeren til login -
// der er ikke andre veje ind i panelet.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesTilOpdatering: CookieTilOpdatering[]) {
          cookiesTilOpdatering.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesTilOpdatering.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const erLoginSide = request.nextUrl.pathname.startsWith("/login");
  // Cron-routen har ingen indlogget bruger - den autoriseres af sit eget
  // CRON_SECRET-tjek (se app/api/cron/cvr-import/route.ts), ikke af en session.
  const erCronRoute = request.nextUrl.pathname.startsWith("/api/cron/");

  if (erCronRoute) {
    return response;
  }

  if (!user && !erLoginSide) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && erLoginSide) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
