"use client";

import { useState } from "react";
import { updateMatch } from "@/actions/match-actions";
import type { Match } from "@/types";

type Props = {
  groupId: string;
  match: Match;
};

/**
 * EditMatchForm — meccs szerkesztő form
 *
 * Miért külön komponens és nem a CreateMatchForm újrahasználása?
 * A szerkesztő form "controlled" defaultValue-kat kap a match propból —
 * az aktuális meccs adatait töltjük be. A Server Action is különböző
 * (updateMatch vs createMatch), és az URL logika is eltér.
 *
 * Miért kapja propként a match objektumot?
 * A szülő Server Component (a /edit oldal) lekérdezi a meccset
 * getMatchById()-dal, majd átadja ide. A Client Component nem
 * tud közvetlenül Supabase-t hívni (csak Server Component tehet ezt).
 *
 * Dátum formázás — datetime-local input formátuma:
 * A datetime-local input "2026-05-04T18:00" formátumot vár.
 * Az adatbázisból ISO 8601 string érkezik: "2026-05-04T16:00:00.000Z"
 * Ezt kell helyi időre konvertálni, majd levágni az utolsó karaktereket.
 *
 * Miért .slice(0, 16)?
 * A datetime-local input csak "YYYY-MM-DDTHH:MM" formátumot fogad el,
 * a másodperceket és milliszekundumokat le kell vágni.
 */

/** ISO string → datetime-local input formátum (helyi idő) */
function toLocalDatetimeInput(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  // toISOString() UTC-t ad vissza → helyi időzónát kell figyelembe venni
  const offset = date.getTimezoneOffset() * 60 * 1000; // timezone eltolás ms-ban
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

export default function EditMatchForm({ groupId, match }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      venue: formData.get("venue"),
      match_date: formData.get("match_date"),
      venue_fee: formData.get("venue_fee") || undefined,
    };

    const result = await updateMatch(groupId, match.id, data);
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
    // Ha redirect() fut a Server Action-ban → ez a kód nem fut le
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div>
        <label htmlFor="venue" className="label">
          Helyszín <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          id="venue"
          name="venue"
          type="text"
          required
          defaultValue={match.venue}
          placeholder="pl. Sportcsarnok Pécs"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="match_date" className="label">
          Meccs dátuma és időpontja{" "}
          <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          id="match_date"
          name="match_date"
          type="datetime-local"
          required
          defaultValue={toLocalDatetimeInput(match.match_date)}
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="venue_fee" className="label">
          Teljes bérleti díj (Ft){" "}
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            (opcionális)
          </span>
        </label>
        <input
          id="venue_fee"
          name="venue_fee"
          type="number"
          min="0"
          step="1"
          defaultValue={
            match.venue_fee != null && match.venue_fee > 0
              ? match.venue_fee
              : ""
          }
          placeholder="pl. 10000"
          className="input-field"
        />
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "var(--notgoing-bg)",
            border: "1px solid var(--notgoing-border)",
            borderRadius: "0.75rem",
            fontSize: "0.82rem",
            color: "var(--notgoing-text)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          style={{ flex: 1, textAlign: "center" }}
        >
          {isPending ? "Mentés..." : "Változtatások mentése"}
        </button>
        <a
          href={`/groups/${groupId}/matches/${match.id}`}
          className="btn-secondary"
          style={{
            padding: "0.75rem 1.25rem",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Mégse
        </a>
      </div>
    </form>
  );
}
