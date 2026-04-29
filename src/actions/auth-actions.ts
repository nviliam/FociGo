"use server";

import { redirect } from "next/navigation";
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

/**
 * Kijelentkezés
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
