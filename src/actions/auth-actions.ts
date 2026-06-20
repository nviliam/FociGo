"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Az URL ahol az app fut — NEXT_PUBLIC_APP_URL elsőbbséget élvez
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

/**
 * Google OAuth bejelentkezés indítása
 * A Supabase generál egy Google redirect URL-t, majd oda irányítunk
 * Ha formData tartalmaz `next` mezőt, bejelentkezés után oda irányít vissza
 */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = formData.get("next")?.toString() ?? "";

  // Csak relatív, /join/ vagy /groups/ útvonalat engedünk — open redirect védelem
  const safeNext =
    next.startsWith("/join/") || next.startsWith("/groups/") ? next : "";

  const callbackUrl = safeNext
    ? `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`
    : `${getBaseUrl()}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
    console.error("Google OAuth hiba:", error.message);
    redirect("/login?error=oauth_failed");
  }

  if (data.url) {
    redirect(data.url);
  }
}

// Zod validáció az email mezőhöz
const MagicLinkSchema = z.object({
  email: z.string().email("Érvénytelen email cím"),
});

/**
 * Email magic-link küldése
 * A Supabase küld egy bejelentkezési linket — kattintás után a /auth/callback dolgozza fel
 */
export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get("email");
  const next = formData.get("next")?.toString() ?? "";

  const validated = MagicLinkSchema.safeParse({ email });
  if (!validated.success) {
    redirect("/login?error=invalid_email");
  }

  const safeNext =
    next.startsWith("/join/") || next.startsWith("/groups/") ? next : "";

  const supabase = await createClient();

  // OTP kód küldése emailRedirectTo NÉLKÜL → 6-jegyű kód kerül az emailbe,
  // nem magic link. Így nincs PKCE, nincs böngésző-függőség, bármilyen
  // email-klienssel és eszközzel működik.
  const { error } = await supabase.auth.signInWithOtp({
    email: validated.data.email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    console.error("OTP hiba:", error.message);
    const isRateLimit = error.message.toLowerCase().includes("rate limit");
    redirect(`/login?error=${isRateLimit ? "rate_limit" : "email_failed"}`);
  }

  // Email + next átadása a kódbeíró oldalnak
  const params = new URLSearchParams({ email: validated.data.email });
  if (safeNext) params.set("next", safeNext);
  redirect(`/login/check-email?${params.toString()}`);
}

/**
 * 6-jegyű OTP kód ellenőrzése — bejelentkezés befejezése
 */
export async function verifyOtpCode(formData: FormData) {
  const email = formData.get("email")?.toString() ?? "";
  const token = formData.get("token")?.toString() ?? "";
  const next = formData.get("next")?.toString() ?? "";

  if (!email || !token) redirect("/login?error=invalid_email");

  const safeNext =
    next.startsWith("/join/") || next.startsWith("/groups/") ? next : "";

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    console.error("OTP verify hiba:", error.message);
    const params = new URLSearchParams({ email, error: "invalid_code" });
    if (safeNext) params.set("next", safeNext);
    redirect(`/login/check-email?${params.toString()}`);
  }

  // Nickname ellenőrzés — ha még nincs, setup oldalra
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ha a session nem jött létre (ritka edge case), küldjük vissza loginra
  if (!user) {
    const params = new URLSearchParams({ email, error: "session_failed" });
    if (safeNext) params.set("next", safeNext);
    redirect(`/login/check-email?${params.toString()}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (!profile?.nickname) {
    const setupParams = new URLSearchParams();
    if (safeNext) setupParams.set("next", safeNext);
    redirect(`/setup${setupParams.size ? `?${setupParams.toString()}` : ""}`);
  }

  redirect(safeNext || "/groups");
}

// Nickname validáció: 2-30 karakter
const NicknameSchema = z.object({
  nickname: z
    .string()
    .min(2, "A nickname legalabb 2 karakter legyen")
    .max(30, "A nickname legfeljebb 30 karakter lehet"),
});

/**
 * Nickname mentése az első bejelentkezés után
 * Sikeres mentés után → /groups
 */
export async function updateNickname(formData: FormData) {
  const nickname = formData.get("nickname");
  const next = formData.get("next")?.toString() ?? "";
  const safeNext =
    next.startsWith("/join/") || next.startsWith("/groups/") ? next : "";

  const validated = NicknameSchema.safeParse({ nickname });
  if (!validated.success) {
    const message =
      validated.error.issues[0]?.message ?? "Ervenytelen nickname";
    const params = new URLSearchParams({ error: message });
    if (safeNext) params.set("next", safeNext);
    redirect(`/setup?${params.toString()}`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      nickname: validated.data.nickname,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error(
      "Nickname mentesi hiba:",
      error.message,
      error.code,
      error.details,
    );
    const params = new URLSearchParams({ error: error.message });
    if (safeNext) params.set("next", safeNext);
    redirect(`/setup?${params.toString()}`);
  }

  redirect(safeNext || "/groups");
}

/**
 * Kijelentkezés
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
