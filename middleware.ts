import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Publikus route-ok — ezekhez nem kell bejelentkezés
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/match", "/join"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase session frissítése minden kérésnél
  // Ez szükséges, hogy a cookie-alapú session ne járjon le
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Session lekérése cookie-ból — hálózati hívás nélkül.
  // A routing döntésekhez elegendő; az adatbiztonságot a DB szintű RLS garantálja.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // Ha védett route és nincs session → /login
  if (!isPublicRoute(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Ha már be van jelentkezve és a /login oldalra megy → /groups
  if (pathname === "/login" && user) {
    const groupsUrl = new URL("/groups", request.url);
    return NextResponse.redirect(groupsUrl);
  }

  // Ha be van jelentkezve de nincs nickname → /setup
  // A "has_profile" cookie cache-eli az eredményt — csak az első kérésnél
  // (vagy ha a cookie lejárt) kell DB-t kérdezni.
  if (user && pathname !== "/setup" && !isPublicRoute(pathname)) {
    const hasProfile = request.cookies.get("has_profile")?.value === "1";

    if (!hasProfile) {
      const { data: profile } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();

      if (!profile?.nickname) {
        const setupUrl = new URL("/setup", request.url);
        return NextResponse.redirect(setupUrl);
      }

      // Nickname megerősítve — következő kéréseknél kihagyjuk a DB hívást
      response.cookies.set("has_profile", "1", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 nap
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Illeszkedik minden kérésre kivéve:
     * - _next/static (statikus fájlok)
     * - _next/image (képek)
     * - favicon.ico
     * - képformátumok (svg, png, jpg, stb.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
