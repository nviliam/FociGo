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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            padding: "2rem",
            maxWidth: "24rem",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>❌</div>
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.5rem",
            }}
          >
            Érvénytelen meghívó
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "24rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚽</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--accent)",
            }}
            className="logo-text"
          >
            FociGo
          </h1>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.4rem",
            }}
          >
            Meghívó
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
            }}
          >
            Csatlakozz a csoporthoz:
          </p>
          <p
            style={{
              color: "var(--accent)",
              fontWeight: 800,
              fontSize: "1.2rem",
              marginBottom: "1.75rem",
            }}
          >
            {group.name}
          </p>

          {user ? (
            <form action={joinGroupByToken}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", textAlign: "center" }}
              >
                Csatlakozás
              </button>
            </form>
          ) : (
            <a
              href={`/login?next=/join/${token}`}
              className="btn-primary"
              style={{
                display: "block",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Bejelentkezés és csatlakozás
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
