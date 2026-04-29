"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Az URL ahol az app fut — Vercel-en automatikusan beállítódik, lokálisan localhost
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

/**
 * Google OAuth bejelentkezés indítása
 * A Supabase generál egy Google redirect URL-t, majd oda irányítunk
 */
export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
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

  const validated = MagicLinkSchema.safeParse({ email });
  if (!validated.success) {
    redirect("/login?error=invalid_email");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: validated.data.email,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });

  if (error) {
    console.error("Magic-link hiba:", error.message);
    redirect("/login?error=email_failed");
  }

  // Sikeres küldés → visszaigazoló oldal
  redirect("/login/check-email");
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

  const validated = NicknameSchema.safeParse({ nickname });
  if (!validated.success) {
    const message =
      validated.error.issues[0]?.message ?? "Ervenytelen nickname";
    redirect(`/setup?error=${encodeURIComponent(message)}`);
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
    redirect(`/setup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/groups");
}

/**
 * Kijelentkezés
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
