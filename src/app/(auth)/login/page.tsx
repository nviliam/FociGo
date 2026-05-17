import Image from "next/image";
import { signInWithGoogle, signInWithMagicLink } from "@/actions/auth-actions";

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, next } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Háttér ragyogás */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(0,230,118,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "26rem", position: "relative" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              marginBottom: "0.5rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Image src="/logo1.png" alt="FociGo logo" width={90} height={90} />
          </div>
          <h1
            className="logo-text"
            style={{
              fontSize: "2.5rem",
              fontWeight: 400,
              color: "var(--accent)",
              lineHeight: 1,
              marginBottom: "0.5rem",
            }}
          >
            FociGo
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Szervezzük meg a következő meccset!
          </p>
        </div>

        {/* Kártya */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            padding: "2rem",
            boxShadow:
              "0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              textAlign: "center",
              marginBottom: "0.4rem",
            }}
          >
            Bejelentkezés
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.82rem",
              textAlign: "center",
              marginBottom: "1.75rem",
            }}
          >
            Lépj be a csoportod meccseinek szervezéséhez
          </p>

          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                background: "var(--notgoing-bg)",
                border: "1px solid var(--notgoing-border)",
                borderRadius: "0.75rem",
                fontSize: "0.82rem",
                color: "var(--notgoing-text)",
                textAlign: "center",
              }}
            >
              {error === "invalid_email"
                ? "Érvénytelen email cím."
                : "Bejelentkezés sikertelen."}
            </div>
          )}

          {/* Google gomb */}
          <form action={signInWithGoogle}>
            {next && <input type="hidden" name="next" value={next} />}
            <button
              type="submit"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "0.8rem 1rem",
                color: "var(--text-primary)",
                fontWeight: 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                style={{ width: "1.1rem", height: "1.1rem" }}
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Belépés Google-lal
            </button>
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "1.5rem 0",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              vagy
            </span>
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
          </div>

          {/* Magic link */}
          <form
            action={signInWithMagicLink}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {next && <input type="hidden" name="next" value={next} />}
            <label htmlFor="email" className="label">
              Belépés email linkkel
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nev@example.com"
              required
              className="input-field"
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", textAlign: "center" }}
            >
              Magic link küldése
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            marginTop: "1.5rem",
          }}
        >
          Belépéssel elfogadod a használati feltételeket.
        </p>
      </div>
    </div>
  );
}
