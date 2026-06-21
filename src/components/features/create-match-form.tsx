"use client";

import { useState } from "react";
import { createMatch } from "@/actions/match-actions";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  groupId: string;
  // Default értékek a csoport beállításaiból — előtöltéshez
  defaultVenue?: string | null;
  defaultVenueFee?: number | null;
};

/**
 * CreateMatchForm — meccs létrehozás form
 *
 * Miért Client Component?
 * - useState kell a hibaüzenet és isPending kezeléséhez
 * - A datetime-local input értékét le kell olvasni JS-ből
 *
 * Miért kapja propként a default értékeket?
 * A Server Component (a szülő oldal) lekérdezi a csoportot,
 * és átadja a default beállításokat. Így a form előtöltött
 * értékekkel nyílik meg, de minden mező felülírható.
 */
export default function CreateMatchForm({
  groupId,
  defaultVenue,
  defaultVenueFee,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // datetime-local input alapértéke: holnap 18:00 (helyi idő)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const defaultDatetime = tomorrow.toISOString().slice(0, 16); // "2026-05-04T18:00"

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

    const result = await createMatch(groupId, data);
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
          defaultValue={defaultVenue ?? ""}
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
          defaultValue={defaultDatetime}
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
          defaultValue={defaultVenueFee ?? ""}
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
          {isPending ? (
            <>
              <Spinner /> Mentés...
            </>
          ) : (
            "Meccs létrehozása"
          )}
        </button>
        <a
          href={`/groups/${groupId}`}
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
