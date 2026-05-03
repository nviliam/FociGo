"use client";

import { useState } from "react";
import { createMatch } from "@/actions/match-actions";

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
      rsvp_deadline: formData.get("rsvp_deadline") || undefined,
    };

    const result = await createMatch(groupId, data);
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
    // Ha redirect() fut a Server Action-ban → ez a kód nem fut le
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Helyszín — kötelező, default előtöltve */}
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
          defaultValue={defaultVenue ?? ""}
          placeholder="pl. Sportcsarnok Pécs"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Meccs dátuma és időpontja — kötelező */}
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
          defaultValue={defaultDatetime}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Terembér — opcionális, default előtöltve */}
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
          defaultValue={defaultVenueFee ?? ""}
          placeholder="pl. 10000"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* RSVP határidő — opcionális */}
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
          {isPending ? "Mentés..." : "Meccs létrehozása"}
        </button>
        <a
          href={`/groups/${groupId}`}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-center"
        >
          Mégse
        </a>
      </div>
    </form>
  );
}
