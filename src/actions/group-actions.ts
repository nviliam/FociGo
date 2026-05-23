"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupSchema } from "@/lib/validations/group-schema";

/**
 * Új csoport létrehozása az aktuális userrel mint admin
 *
 * Miért randomUUID() és nem .select() az insert után?
 * PostgreSQL 15 RLS viselkedés: INSERT + RETURNING esetén a DB
 * a SELECT policy-t is ellenőrzi az újonnan létrehozott soron.
 * A SELECT policy "is_group_member(id)" — de a group_members sor
 * még nem létezik ezen a ponton → RLS violation hiba.
 * Megoldás: az UUID-t előre generáljuk, így nincs szükség visszaolvasásra.
 */
export async function createGroup(data: unknown) {
  const supabase = await createClient();

  // 1. Auth ellenőrzés
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Zod validáció
  const validated = CreateGroupSchema.safeParse(data);
  if (!validated.success) {
    const firstError = validated.error.issues[0]?.message;
    return { error: firstError ?? "Érvénytelen adatok" };
  }

  // 3. UUID előre generálása — így nem kell .select() az insert után
  const groupId = randomUUID();

  // 4. Csoport létrehozása (NINCS .select() — elkerüljük a PG15 RLS csapdát)
  const { error: groupError } = await supabase
    .from("groups")
    .insert({ id: groupId, ...validated.data });

  if (groupError) {
    console.error("Group insert error:", groupError.message);
    return { error: "A csoport mentése sikertelen. Próbáld újra!" };
  }

  // 5. Admin tag hozzáadása
  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    is_admin: true,
  });

  if (memberError) {
    console.error("Group member insert error:", memberError.message);
    return { error: "A tag hozzáadása sikertelen. Próbáld újra!" };
  }

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

/**
 * A bejelentkezett user összes csoportjának lekérdezése
 */
export async function getUserGroups() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("group_members")
    .select("is_admin, groups(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserGroups error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Csoport lekérdezése ID alapján (tag/admin láthatja — RLS)
 * Visszaadja a csoport adatait + tagjait + invite_token-t
 */
export async function getGroupById(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("groups")
    .select("*, group_members(user_id, is_admin, users(nickname))")
    .eq("id", groupId)
    .single();

  if (error) {
    console.error("getGroupById error:", error.message);
    return null;
  }

  return data;
}

/**
 * Csatlakozás csoporthoz meghívó token alapján
 * RPC hívás — SECURITY DEFINER függvény végzi az INSERT-et (RLS megkerülése)
 * Hiba esetén a /join/[token]?error=... oldalra irányít vissza
 */
export async function joinGroupByToken(formData: FormData) {
  const token = formData.get("token")?.toString();
  if (!token) redirect("/groups");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/join/${token}`);

  // Ha nincs users sor (setup kimaradt), irányítás a nickname beállításhoz
  const { data: profile } = await supabase
    .from("users")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (!profile?.nickname) {
    redirect(`/setup?next=/join/${token}`);
  }

  const { data, error } = await supabase.rpc("join_group_by_invite_token", {
    p_token: token,
  });

  if (error) {
    console.error("joinGroupByToken error:", error.message);
    redirect(`/join/${token}?error=invalid`);
  }

  const groupId = (data as Array<{ group_id: string }>)[0]?.group_id;

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

/**
 * Admin jogkör átruházása egy másik csoporttagnak
 *
 * Miért két UPDATE és nem egy?
 * Az SQL tranzakció garantálja, hogy vagy mindkét UPDATE sikeres,
 * vagy egyik sem — sosem marad a csoport admin nélkül vagy két adminnal.
 *
 * Supabase JS client-ben nincs natív tranzakció API,
 * ezért egy SECURITY DEFINER SQL függvényt hívunk RPC-vel.
 */
export async function transferAdmin(groupId: string, newAdminUserId: string) {
  const supabase = await createClient();

  // 1. Auth ellenőrzés
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nincs bejelentkezve." };

  // 2. Szerver oldali admin jogkör ellenőrzés (AC5)
  // Nem elég a UI-on elrejteni a gombot — a szerveren is ellenőrizni kell!
  const { data: currentMembership, error: memberError } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !currentMembership?.is_admin) {
    return { error: "Nincs admin jogköröd ehhez a művelethez." };
  }

  // 3. Biztonsági ellenőrzés: saját magának nem adhatja át
  if (newAdminUserId === user.id) {
    return { error: "Saját magadnak nem adhatod át az admin szerepkört." };
  }

  // 4. Az új admin valóban tagja-e a csoportnak?
  const { data: newAdminMembership, error: newAdminError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", newAdminUserId)
    .single();

  if (newAdminError || !newAdminMembership) {
    return { error: "A kiválasztott felhasználó nem tagja a csoportnak." };
  }

  // 5. Admin átruházás RPC hívással (atomikus tranzakció az adatbázisban)
  const { error: transferError } = await supabase.rpc("transfer_group_admin", {
    p_group_id: groupId,
    p_old_admin_id: user.id,
    p_new_admin_id: newAdminUserId,
  });

  if (transferError) {
    console.error("transferAdmin RPC error:", transferError.message);
    return { error: "Az átruházás sikertelen. Próbáld újra!" };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

/**
 * Csoport törlése
 *
 * Csak admin törölheti a saját csoportját.
 * A CASCADE FK constraint automatikusan törli a group_members,
 * matches és rsvp rekordokat is.
 */
export async function deleteGroup(groupId: string) {
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
    return { error: "Csak admin törölheti a csoportot." };
  }

  // 3. Törlés
  const { error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (deleteError) {
    console.error("deleteGroup error:", deleteError.message);
    return { error: "A törlés sikertelen. Próbáld újra!" };
  }

  revalidatePath("/groups");
  redirect("/groups");
}
