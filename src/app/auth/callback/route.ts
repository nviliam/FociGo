import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback route — Google OAuth és Magic Link után ide irányít vissza a Supabase
 *
 * Két lehetséges flow:
 * 1. PKCE (Google OAuth + újabb Supabase magic link): `code` param → exchangeCodeForSession
 * 2. OTP (Magic Link server-side hívásból): `token_hash` + `type` → verifyOtp
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const error = searchParams.get("error");
  // next = visszairányítási útvonal (pl. /join/[token])
  const next = searchParams.get("next") ?? "";

  // Ha a Google OAuth hibát adott vissza
  if (error) {
    console.error("OAuth callback hiba:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const supabase = await createClient();

  if (tokenHash && type) {
    // Magic Link OTP flow (server-side signInWithOtp esetén)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      console.error("OTP verify hiba:", verifyError.message);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }
  } else if (code) {
    // PKCE flow (Google OAuth, vagy PKCE-alapú magic link)
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange hiba:", exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }
  } else {
    // Sem code, sem token_hash → váratlan eset
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
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

  // Váratlan eset — visszairányítás a login oldalra
  return NextResponse.redirect(`${origin}/login?error=unexpected`);
}
