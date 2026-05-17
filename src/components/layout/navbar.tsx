import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth-actions";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nickname = "";
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", user.id)
      .single();
    nickname = data?.nickname ?? "";
  }

  return (
    <header
      style={{
        background: "rgba(6, 10, 18, 0.85)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "56rem",
          margin: "0 auto",
          padding: "0 1rem",
          height: "3.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/groups"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          <Image src="/logo1.png" alt="FociGo logo" width={32} height={32} />
          <span
            className="logo-text"
            style={{
              fontWeight: 400,
              fontSize: "1.1rem",
              color: "var(--accent)",
            }}
          >
            FociGo
          </span>
        </Link>

        {/* Jobb oldal */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                display: "none",
              }}
              className="sm-inline"
            >
              {nickname}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="btn-secondary"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.3rem 0.75rem",
                  cursor: "pointer",
                }}
              >
                Kilépés
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
