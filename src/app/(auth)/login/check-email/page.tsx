"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { verifyOtpCode } from "@/actions/auth-actions";

function CheckEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const next = searchParams.get("next") ?? "";
  const error = searchParams.get("error");

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
      <div style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
          }}
        >
          Ellenőrizd az emailedet!
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "1.75rem",
            lineHeight: 1.6,
          }}
        >
          Küldtünk egy{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            bejelentkezési kódot
          </strong>{" "}
          a <span style={{ color: "var(--accent)" }}>{email}</span> címre. Írd
          be ide:
        </p>

        {error === "invalid_code" && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              background: "var(--notgoing-bg)",
              border: "1px solid var(--notgoing-border)",
              borderRadius: "0.75rem",
              fontSize: "0.82rem",
              color: "var(--notgoing-text)",
            }}
          >
            Érvénytelen vagy lejárt kód. Kérj újat.
          </div>
        )}

        <form
          action={verifyOtpCode}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <input type="hidden" name="email" value={email} />
          {next && <input type="hidden" name="next" value={next} />}
          <input
            name="token"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6,8}"
            maxLength={8}
            required
            autoFocus
            placeholder="12345678"
            className="input-field"
            style={{
              textAlign: "center",
              fontSize: "1.5rem",
              letterSpacing: "0.3em",
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", textAlign: "center" }}
          >
            Belépés
          </button>
        </form>

        <a
          href="/login"
          style={{
            display: "block",
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          ← Vissza a bejelentkezéshez
        </a>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailForm />
    </Suspense>
  );
}
