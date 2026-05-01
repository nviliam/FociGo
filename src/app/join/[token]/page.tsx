import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinGroupByToken } from "@/actions/group-actions";

type Props = {
  params: Promise<{ token: string }>;
};

/**
 * /join/[token] — Nyilvános meghívó oldal
 *
 * Ez az oldal NINCS az (app) route csoportban → nincs auth middleware.
 * A middleware PUBLIC_ROUTES tartalmazza a /join útvonalat.
 *
 * Folyamat:
 * 1. Token alapján lekérdezzük a csoport nevét (SECURITY DEFINER RPC)
 * 2. Ha nincs ilyen token → 404 szerű hibaüzenet
 * 3. Ha be van jelentkezve → "Csatlakozás" gomb (form action)
 * 4. Ha nincs bejelentkezve → login linkkel, visszairányítással
 */
export default async function JoinPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // Csoport adatok lekérése token alapján (SECURITY DEFINER — RLS megkerülése)
  const { data: groupRows, error } = await supabase.rpc(
    "get_group_by_invite_token",
    { p_token: token },
  );

  if (error || !groupRows || groupRows.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            Érvénytelen meghívó
          </h1>
          <p className="text-gray-500 text-sm">
            Ez a meghívó link nem létezik vagy lejárt.
          </p>
        </div>
      </div>
    );
  }

  const group = groupRows[0] as { id: string; name: string };

  // Bejelentkezett user ellenőrzése
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ha már tag → átirányítás a csoport oldalára
  if (user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      redirect(`/groups/${group.id}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-600 mb-2">FociGo</h1>
          <p className="text-gray-500 text-sm">Focimeccs szervező</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⚽</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              Meghívó
            </h2>
            <p className="text-gray-500 text-sm">Csatlakozz a csoporthoz:</p>
            <p className="text-green-600 font-bold text-lg mt-2">
              {group.name}
            </p>
          </div>

          {user ? (
            /* Bejelentkezett: csatlakozás gomb */
            <form action={joinGroupByToken}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full bg-green-600 text-white rounded-xl px-4 py-3 font-medium hover:bg-green-700 transition-colors"
              >
                Csatlakozás
              </button>
            </form>
          ) : (
            /* Nem bejelentkezett: login link next param-mal */
            <a
              href={`/login?next=/join/${token}`}
              className="block w-full bg-green-600 text-white rounded-xl px-4 py-3 font-medium hover:bg-green-700 transition-colors text-center"
            >
              Bejelentkezés és csatlakozás
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
