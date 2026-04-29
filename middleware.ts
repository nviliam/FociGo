import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Publikus route-ok — ezekhez nem kell bejelentkezés
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/match"];

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

  // Session lekérése — ez automatikusan frissíti a tokent ha szükséges
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
