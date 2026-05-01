"use client";

import { useState } from "react";
import { createGroup } from "@/actions/group-actions";

export default function CreateGroupForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      default_venue: formData.get("default_venue") || undefined,
      default_schedule: formData.get("default_schedule") || undefined,
      default_venue_fee: formData.get("default_venue_fee") || undefined,
    };

    const result = await createGroup(data);
    // Ha redirect() hívódik a Server Action-ban, ez a sor nem fut le
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Csoport neve — kötelező */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Csoport neve <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="pl. Szerda esti foci"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Default helyszín — opcionális */}
      <div>
        <label
          htmlFor="default_venue"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Default helyszín{" "}
          <span className="text-gray-400 font-normal">(opcionális)</span>
        </label>
        <input
          id="default_venue"
          name="default_venue"
          type="text"
          placeholder="pl. Sportcsarnok Pécs"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Default menetrend — opcionális */}
      <div>
        <label
          htmlFor="default_schedule"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Default menetrend{" "}
          <span className="text-gray-400 font-normal">(opcionális)</span>
        </label>
        <input
          id="default_schedule"
          name="default_schedule"
          type="text"
          placeholder="pl. minden szerda 18:00"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Default terembérlési díj — opcionális */}
      <div>
        <label
          htmlFor="default_venue_fee"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Default terembérlési díj (Ft){" "}
          <span className="text-gray-400 font-normal">(opcionális)</span>
        </label>
        <input
          id="default_venue_fee"
          name="default_venue_fee"
          type="number"
          min="0"
          step="1"
          placeholder="pl. 10000"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Hibaüzenet */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit gomb */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Létrehozás..." : "Csoport létrehozása"}
      </button>
    </form>
  );
}
