import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback route — Google OAuth után ide irányít vissza a Supabase
 *
 * Folyamat:
 * 1. Supabase visszaküldi a `code` paramétert az URL-ben
 * 2. Kicseréljük session tokenre (PKCE flow)
 * 3. Ha van nickname → /groups, ha nincs → /setup (nickname választás)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  // next = visszairányítási útvonal (pl. /join/[token])
  const next = searchParams.get("next") ?? "";

  // Ha a Google OAuth hibát adott vissza
  if (error) {
    console.error("OAuth callback hiba:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (code) {
    const supabase = await createClient();

    // PKCE: a code-ot kicseréljük session tokenre
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange hiba:", exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }

    // Ellenőrizzük, hogy van-e már nickname
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();

      // Csak /join/ és /groups/ útvonalakat engedünk — open redirect védelem
      const safeNext =
        next.startsWith("/join/") || next.startsWith("/groups/") ? next : "";

      // Ha nincs nickname → nickname setup oldalra
      if (!profile?.nickname) {
        return NextResponse.redirect(`${origin}/setup`);
      }

      // Ha van next param → oda irányítunk (pl. join oldal)
      if (safeNext) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      // Alapértelmezett: csoportok listájára
      return NextResponse.redirect(`${origin}/groups`);
    }
  }

  // Váratlan eset — visszairányítás a login oldalra
  return NextResponse.redirect(`${origin}/login?error=unexpected`);
}
