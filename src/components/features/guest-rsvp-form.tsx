"use client";

import { useState, useTransition } from "react";
import { guestRsvp } from "@/actions/rsvp-actions";
import type { RsvpStatus } from "@/types";

type Props = {
  matchId: string;
};

/**
 * GuestRsvpForm — Vendég visszajelzés bejelentkezés nélkül
 *
 * Miért Client Component?
 * - useState kell a névhez, a kiválasztott státuszhoz és a visszajelzett állapothoz
 * - useTransition kell a Server Action loading állapotához
 *
 * Működés:
 * 1. A vendég begépeli a nevét
 * 2. Rákattint a "✓ Jövök" vagy "✗ Nem jövök" gombra
 * 3. A Server Action upsert-eli a guest_rsvps táblába
 * 4. Sikernél megerősítő üzenet jelenik meg (módosítás lehetőségével)
 *
 * Ugyanolyan névvel újra elküldve: frissíti a státuszt (upsert).
 */
export function GuestRsvpForm({ matchId }: Props) {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState<{
    name: string;
    status: RsvpStatus;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRsvp(status: RsvpStatus) {
    if (!name.trim()) {
      setError("Add meg a neved a visszajelzéshez.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await guestRsvp(matchId, name, status);
      if (result?.error) {
        setError(result.error);
      } else {
        setSubmitted({ name: name.trim(), status });
      }
    });
  }

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "0.75rem 0" }}>
        <p style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>
          {submitted.status === "going" ? "✅" : "❌"}
        </p>
        <p
          style={{
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.25rem",
          }}
        >
          {submitted.status === "going"
            ? `${submitted.name} — visszajelzésed: Jövök!`
            : `${submitted.name} — visszajelzésed: Nem jövök.`}
        </p>
        <button
          onClick={() => setSubmitted(null)}
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "var(--accent)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Módosítom
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
        Add meg a neved, és jelezd, hogy jössz-e:
      </p>
      <input
        type="text"
        placeholder="Neved (pl. Kovács Péter)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        disabled={isPending}
        style={{
          width: "100%",
          padding: "0.65rem 1rem",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          outline: "none",
          boxSizing: "border-box",
          opacity: isPending ? 0.6 : 1,
        }}
      />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => handleRsvp("going")}
          disabled={isPending}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: isPending ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            border: "1px solid var(--going-border, rgba(0,230,118,0.4))",
            background: "var(--going-bg, rgba(0,230,118,0.1))",
            color: "var(--going-text, #00e676)",
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {isPending ? "..." : "✓ Jövök"}
        </button>
        <button
          onClick={() => handleRsvp("not_going")}
          disabled={isPending}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: isPending ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            border: "1px solid var(--notgoing-border, rgba(255,107,107,0.4))",
            background: "var(--notgoing-bg, rgba(255,107,107,0.1))",
            color: "var(--notgoing-text, #ff6b6b)",
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {isPending ? "..." : "✗ Nem jövök"}
        </button>
      </div>
      {error && <p style={{ fontSize: "0.8rem", color: "#ef4444" }}>{error}</p>}
    </div>
  );
}
