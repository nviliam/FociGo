"use client";

import { useState, useTransition } from "react";
import { upsertRsvp, deleteRsvp } from "@/actions/rsvp-actions";
import type { RsvpStatus } from "@/types";

type Props = {
  matchId: string;
  initialStatus: RsvpStatus | null; // null = még nem jelzett vissza
};

/**
 * RsvpButtons — Jövök / Nem jövök gombok
 *
 * Miért Client Component?
 * - useState kell az optimista UI-hoz (azonnali vizuális visszajelzés)
 * - useTransition kell a Server Action loading állapotához
 * - Az optimista UI azt jelenti: a gomb azonnal megváltozik kattintásra,
 *   nem vár a szerver válaszra. Ha a szerver hibát ad vissza → visszaáll.
 *
 * Mi az "optimista UI" (optimistic UI)?
 * Ahelyett, hogy megvárnánk a szerver választ (ami 200-500ms is lehet),
 * azonnal frissítjük a felhasználói felületet, mintha már sikerült volna.
 * Ha hiba van, visszaállítjuk az előző állapotot. Ez sokkal gyorsabbnak
 * érzi az alkalmazást.
 *
 * Toggle logika (AC6):
 * - Ha a user "Jövök"-re kattint és már "going" → RSVP törlés
 * - Ha "Jövök"-re kattint és más státusz (vagy nincs) → UPSERT 'going'
 * - Ugyanez "Nem jövök"-re
 */
export function RsvpButtons({
  matchId,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleRsvp(clicked: RsvpStatus) {
    setError(null);

    // Optimista UI: azonnal frissítjük az állapotot
    const previousStatus = status;
    const isToggle = status === clicked; // ugyanarra kattintott → törlés

    if (isToggle) {
      setStatus(null); // optimista: törölt
    } else {
      setStatus(clicked); // optimista: frissített
    }

    startTransition(async () => {
      let result;
      if (isToggle) {
        result = await deleteRsvp(matchId);
      } else {
        result = await upsertRsvp(matchId, clicked);
      }

      if (result?.error) {
        // Visszaállítás hibánál
        setStatus(previousStatus);
        setError(result.error);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
            border:
              status === "going"
                ? "1px solid var(--going-border)"
                : "1px solid var(--border)",
            background: status === "going" ? "var(--going-bg)" : "transparent",
            color:
              status === "going"
                ? "var(--going-text)"
                : "var(--text-secondary)",
            boxShadow:
              status === "going" ? "0 0 16px rgba(0,230,118,0.2)" : "none",
            opacity: isPending ? 0.5 : 1,
          }}
        >
          ✓ Jövök
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
            border:
              status === "not_going"
                ? "1px solid var(--notgoing-border)"
                : "1px solid var(--border)",
            background:
              status === "not_going" ? "var(--notgoing-bg)" : "transparent",
            color:
              status === "not_going"
                ? "var(--notgoing-text)"
                : "var(--text-secondary)",
            boxShadow:
              status === "not_going"
                ? "0 0 16px rgba(255,107,107,0.2)"
                : "none",
            opacity: isPending ? 0.5 : 1,
          }}
        >
          ✗ Nem jövök
        </button>
      </div>

      {status === null && !isPending && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Még nem jelzett vissza — kattints a gombra!
        </p>
      )}

      {error && (
        <div
          style={{
            padding: "0.6rem 0.75rem",
            background: "var(--notgoing-bg)",
            border: "1px solid var(--notgoing-border)",
            borderRadius: "0.75rem",
            fontSize: "0.78rem",
            color: "var(--notgoing-text)",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
