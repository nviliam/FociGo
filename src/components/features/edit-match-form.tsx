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
      rsvp_deadline: formData.get("rsvp_deadline") || undefined,
    };

    const result = await updateMatch(groupId, match.id, data);
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
    // Ha redirect() fut a Server Action-ban → ez a kód nem fut le
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Helyszín — kötelező, előtöltve a jelenlegi értékkel */}
      <div>
        <label
          htmlFor="venue"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Helyszín <span className="text-red-500">*</span>
        </label>
        <input
          id="venue"
          name="venue"
          type="text"
          required
          defaultValue={match.venue}
          placeholder="pl. Sportcsarnok Pécs"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Meccs dátuma és időpontja — kötelező, előtöltve */}
      <div>
        <label
          htmlFor="match_date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Meccs dátuma és időpontja <span className="text-red-500">*</span>
        </label>
        <input
          id="match_date"
          name="match_date"
          type="datetime-local"
          required
          defaultValue={toLocalDatetimeInput(match.match_date)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Terembér — opcionális, előtöltve */}
      <div>
        <label
          htmlFor="venue_fee"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Terembér (Ft){" "}
          <span className="text-gray-400 font-normal">(opcionális)</span>
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* RSVP határidő — opcionális, előtöltve ha volt */}
      <div>
        <label
          htmlFor="rsvp_deadline"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          RSVP határidő{" "}
          <span className="text-gray-400 font-normal">(opcionális)</span>
        </label>
        <input
          id="rsvp_deadline"
          name="rsvp_deadline"
          type="datetime-local"
          defaultValue={toLocalDatetimeInput(match.rsvp_deadline)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          A határidő után a visszajelzések lezárulnak és az ár rögzül.
        </p>
      </div>

      {/* Hibaüzenet */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Gombok */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-green-600 text-white rounded-xl px-4 py-3 font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Mentés..." : "Változtatások mentése"}
        </button>
        <a
          href={`/groups/${groupId}/matches/${match.id}`}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-center"
        >
          Mégse
        </a>
      </div>
    </form>
  );
}
