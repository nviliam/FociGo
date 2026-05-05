"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RsvpStatus } from "@/types";

/**
 * RSVP UPSERT — visszajelzés adása vagy módosítása
 *
 * Miért UPSERT és nem INSERT?
 * Az `rsvps` táblán UNIQUE(match_id, user_id) constraint van —
 * egy user csak egyszer jelezhet vissza egy meccsre. Ha már van
 * visszajelzés és újra kattint (pl. "Nem jövök"-ről "Jövök"-re),
 * az UPDATE futna. Az UPSERT (INSERT ON CONFLICT DO UPDATE) ezt
 * automatikusan kezeli egyetlen lekéréssel.
 *
 * Miért randomUUID() előre?
 * Konzisztencia a többi INSERT-tel — ha nem adunk .select()-et,
 * nincs PG15 RLS returning probléma. Az id előre generálása
 * lehetővé teszi az INSERT-et .select() nélkül, miközben az
 * id mező is kitöltött marad.
 *
 * onConflict: "match_id,user_id" — ha létezik már sor ezzel
 * a kombinációval, az UPDATE futtatja a status frissítést.
 */
export async function upsertRsvp(matchId: string, status: RsvpStatus) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tagság ellenőrzés — Defense in depth (RLS is ellenőrzi, de szerver oldalon is)
  const { data: match } = await supabase
    .from("matches")
    .select("group_id, rsvp_deadline")
    .eq("id", matchId)
    .single();

  if (!match) return { error: "A meccs nem található." };

  // Tagság ellenőrzés
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", match.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership)
    return { error: "Csak csoporttag adhat vissza visszajelzést." };

  // Határidő ellenőrzés (AC4) — RLS is ellenőrzi, de szerveren is
  if (match.rsvp_deadline && new Date(match.rsvp_deadline) < new Date()) {
    return { error: "Az RSVP határidő lejárt, nem lehet módosítani." };
  }

  // UPSERT — randomUUID előre, nincs .select()
  const id = randomUUID();
  const { error } = await supabase
    .from("rsvps")
    .upsert(
      { id, match_id: matchId, user_id: user.id, status },
      { onConflict: "match_id,user_id" },
    );

  if (error) {
    console.error("upsertRsvp error:", error.message);
    return { error: "A visszajelzés mentése sikertelen. Próbáld újra!" };
  }

  revalidatePath(`/groups/${match.group_id}/matches/${matchId}`);
  return { success: true };
}

/**
 * RSVP törlése (visszavonás)
 *
 * Mikor fut ez le?
 * Ha a user ugyanarra a gombra kattint, amelyik már aktív
 * (toggle viselkedés — pl. "Jövök"-re kattint, de már "Jövök" van → törlés)
 */
export async function deleteRsvp(matchId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("group_id, rsvp_deadline")
    .eq("id", matchId)
    .single();

  if (!match) return { error: "A meccs nem található." };

  // Határidő ellenőrzés
  if (match.rsvp_deadline && new Date(match.rsvp_deadline) < new Date()) {
    return { error: "Az RSVP határidő lejárt, nem lehet visszavonni." };
  }

  const { error } = await supabase
    .from("rsvps")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", user.id);

  if (error) {
    console.error("deleteRsvp error:", error.message);
    return { error: "A visszajelzés törlése sikertelen. Próbáld újra!" };
  }

  revalidatePath(`/groups/${match.group_id}/matches/${matchId}`);
  return { success: true };
}

/**
 * Összes RSVP lekérése egy meccshez (tagok névvel együtt)
 *
 * Miért join a users táblával?
 * Az RSVP listában a tagok nevét is meg kell jeleníteni, nem csak az ID-t.
 * A Supabase select("*, users(nickname)") automatikusan elvégzi a JOIN-t
 * a foreign key alapján.
 *
 * Ez a függvény mind a Server Component (initial load) mind a Realtime
 * callback-ből hívható (Story 5.2).
 */
export async function getRsvpsByMatch(matchId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("rsvps")
    .select("id, match_id, user_id, status, users(nickname)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getRsvpsByMatch error:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Array<{
    id: string;
    match_id: string;
    user_id: string;
    status: RsvpStatus;
    users: { nickname: string } | null;
  }>;
}

/**
 * RSVP számok lekérése egy csoport összes meccsére
 *
 * Mire való?
 * A csoport oldal meccs listáján (Story 6.1) minden kártyán meg kell
 * jeleníteni: hány ember jön, fejenkénti ár. Ehhez az összes meccs
 * összes RSVP-jét kell lekérni egyetlen lekéréssel.
 *
 * Visszatérési formátum:
 * Map<matchId, { going: number; notGoing: number }>
 * — JS Map, hogy O(1) időben kereshető legyen match_id alapján.
 *
 * Miért nem join a getMatchesByGroup()-on belül?
 * A Supabase select-ben lehet nested select, de COUNT aggregációt
 * nem tud kifejezni — csak az összes sort hozná vissza.
 * Egyszerűbb külön lekérni és JS-ben aggregálni.
 */
export async function getRsvpCountsByGroup(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Lekérjük az összes RSVP-t a csoport meccseihez (join matches-en keresztül)
  const { data, error } = await supabase
    .from("rsvps")
    .select("match_id, status, matches!inner(group_id)")
    .eq("matches.group_id", groupId);

  if (error) {
    console.error("getRsvpCountsByGroup error:", error.message);
    return new Map<string, { going: number; notGoing: number }>();
  }

  // Aggregálás JS-ben: match_id → {going, notGoing}
  const counts = new Map<string, { going: number; notGoing: number }>();
  for (const rsvp of data ?? []) {
    const entry = counts.get(rsvp.match_id) ?? { going: 0, notGoing: 0 };
    if (rsvp.status === "going") entry.going++;
    else entry.notGoing++;
    counts.set(rsvp.match_id, entry);
  }
  return counts;
}

/**
 * Nyilvános RSVP lista lekérése — auth nélkül
 *
 * Miért külön függvény?
 * A getRsvpsByMatch() auth.getUser()-t hív és redirect("/login")-t dob
 * ha nincs bejelentkezett user. A /match/[token] nyilvános oldal viszont
 * anonymous felhasználóknak is meg kell jeleníteni az RSVP listát.
 *
 * Az RLS policy ("rsvps: nyilvános token RSVP olvasás") engedélyezi
 * az anonymous olvasást, ha a meccsnek van public_token-je.
 * Ezért itt nincs auth ellenőrzés — az anon Supabase kulcs elegendő.
 */
export async function getRsvpsByMatchPublic(matchId: string) {
  const supabase = await createClient();
  // Szándékosan nincs getUser() call — anonymous access

  const { data, error } = await supabase
    .from("rsvps")
    .select("id, match_id, user_id, status, users(nickname)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getRsvpsByMatchPublic error:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Array<{
    id: string;
    match_id: string;
    user_id: string;
    status: RsvpStatus;
    users: { nickname: string } | null;
  }>;
}
