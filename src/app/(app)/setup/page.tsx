import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateNickname } from "@/actions/auth-actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SetupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ha mar van nickname, nincs szukseg a setup oldalra
  const { data: profile } = await supabase
    .from("users")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (profile?.nickname) {
    redirect("/groups");
  }

  const { error } = await searchParams;

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
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚽</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--accent)",
              letterSpacing: "-0.03em",
            }}
          >
            FociGo
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              marginTop: "0.3rem",
            }}
          >
            Már csak egy lépés!
          </p>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            padding: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              textAlign: "center",
              marginBottom: "0.4rem",
            }}
          >
            Válassz nicknevet!
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.82rem",
              textAlign: "center",
              marginBottom: "1.5rem",
            }}
          >
            Ez a név jelenik meg a csoportban az RSVP-listában. (2–30 karakter)
          </p>

          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                background: "var(--notgoing-bg)",
                border: "1px solid var(--notgoing-border)",
                borderRadius: "0.75rem",
                fontSize: "0.82rem",
                color: "var(--notgoing-text)",
                textAlign: "center",
              }}
            >
              {error === "save_failed"
                ? "Mentés sikertelen. Kérjük próbáld újra."
                : decodeURIComponent(error)}
            </div>
          )}

          <form
            action={updateNickname}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <label htmlFor="nickname" className="label">
              Nickname
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder="pl. Kovács Jani"
              minLength={2}
              maxLength={30}
              required
              autoFocus
              className="input-field"
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", textAlign: "center" }}
            >
              Mentés és tovább →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
