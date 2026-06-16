"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateMatchSchema } from "@/lib/validations/match-schema";

// Az UpdateMatchSchema ugyanaz, mint a CreateMatchSchema —
// minden mező ugyanolyan validációs szabályokkal frissíthető
const UpdateMatchSchema = CreateMatchSchema;

/**
 * Új meccs létrehozása egy csoporthoz
 *
 * Miért randomUUID() előre?
 * Ugyanaz a PG15 RLS csapda mint a csoport létrehozásnál:
 * INSERT + .select() esetén a SELECT policy is lefut az új soron,
 * de a policy "is_group_member(group_id)" — ez rendben van,
 * mert a meccs group_id-ja alapján a tagság ellenőrizhető.
 * Mégis előre generálunk UUID-t a konzisztencia kedvéért.
 */
export async function createMatch(groupId: string, data: unknown) {
  const supabase = await createClient();

  // 1. Auth ellenőrzés
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Admin jogkör ellenőrzés (AC6)
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership?.is_admin) {
    return { error: "Csak admin hozhat létre meccset." };
  }

  // 3. Zod validáció
  const validated = CreateMatchSchema.safeParse(data);
  if (!validated.success) {
    return {
      error: validated.error.issues[0]?.message ?? "Érvénytelen adatok",
    };
  }

  const { venue, match_date, venue_fee } = validated.data;

  // 4. Meccs létrehozása (UUID előre generálva — PG15 RLS csapda elkerülése)
  const matchId = randomUUID();

  const { error: insertError } = await supabase.from("matches").insert({
    id: matchId,
    group_id: groupId,
    venue,
    match_date: match_date.toISOString(),
    venue_fee: venue_fee ?? 0,
  });

  if (insertError) {
    console.error("Match insert error:", insertError.message);
    return { error: "A meccs mentése sikertelen. Próbáld újra!" };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

/**
 * Csoport meccslistájának lekérdezése
 * Legközelebbi meccsek először (match_date ASC)
 */
export async function getMatchesByGroup(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("group_id", groupId)
    .order("match_date", { ascending: true });

  if (error) {
    console.error("getMatchesByGroup error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Egyetlen meccs lekérdezése ID alapján
 * RLS garantálja: csak a csoport tagjai látják
 */
export async function getMatchById(matchId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    console.error("getMatchById error:", error.message);
    return null;
  }

  return data;
}

/**
 * Meccs adatainak frissítése
 *
 * Miért UPDATE és nem DELETE + INSERT?
 * Az UPDATE megőrzi a meglévő sorhoz kapcsolódó RSVP rekordokat.
 * DELETE + INSERT esetén az RSVP-k is törlődnének (CASCADE).
 *
 * UPDATE-nél nincs PG15 RLS csapda: a RETURNING záradék nem fut le,
 * mert nem hívunk .select()-et az update után.
 */
export async function updateMatch(
  groupId: string,
  matchId: string,
  data: unknown,
) {
  const supabase = await createClient();

  // 1. Auth ellenőrzés
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Admin jogkör ellenőrzés (AC5)
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership?.is_admin) {
    return { error: "Csak admin szerkeszthet meccset." };
  }

  // 3. Zod validáció
  const validated = UpdateMatchSchema.safeParse(data);
  if (!validated.success) {
    return {
      error: validated.error.issues[0]?.message ?? "Érvénytelen adatok",
    };
  }

  const { venue, match_date, venue_fee } = validated.data;

  // 4. UPDATE — nincs .select(), nincs PG15 RLS csapda
  const { error: updateError } = await supabase
    .from("matches")
    .update({
      venue,
      match_date: match_date.toISOString(),
      venue_fee: venue_fee ?? 0,
    })
    .eq("id", matchId);

  if (updateError) {
    console.error("Match update error:", updateError.message);
    return { error: "A meccs mentése sikertelen. Próbáld újra!" };
  }

  revalidatePath(`/groups/${groupId}/matches/${matchId}`);
  redirect(`/groups/${groupId}/matches/${matchId}`);
}

/**
 * Nyilvános meccs lekérdezése public_token alapján
 *
 * Miért nincs auth ellenőrzés?
 * Ez a függvény a /match/[token] nyilvános oldalhoz készült —
 * bejelentkezés nélkül is elérhető. Az RLS policy (002_rls_policies.sql)
 * engedélyezi az olvasást: "public_token IS NOT NULL" feltétellel.
 * Tehát az anon Supabase kulccsal is lekérdezhető a meccs.
 *
 * Miben különbözik a getMatchById-tól?
 * - Nincs auth check (anon user is hívhatja)
 * - public_token szerint keres, nem id szerint
 * - Külön Server Action, hogy a szándék egyértelmű legyen
 */
export async function getMatchByPublicToken(token: string) {
  const supabase = await createClient();
  // Nem hívunk getUser()-t — szándékosan nincs auth ellenőrzés

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("public_token", token)
    .single();

  if (error) {
    console.error("getMatchByPublicToken error:", error.message);
    return null;
  }

  return data;
}

/**
 * Meccs törlése
 *
 * Csak admin törölheti. A CASCADE FK constraint törli a kapcsolódó
 * rsvp rekordokat is.
 */
export async function deleteMatch(groupId: string, matchId: string) {
  const supabase = await createClient();

  // 1. Auth ellenőrzés
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nincs bejelentkezve." };

  // 2. Admin jogkör ellenőrzés
  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership?.is_admin) {
    return { error: "Csak admin törölhet meccset." };
  }

  // 3. Törlés
  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (deleteError) {
    console.error("deleteMatch error:", deleteError.message);
    return { error: "A törlés sikertelen. Próbáld újra!" };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
