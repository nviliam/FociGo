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
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div>
        <label htmlFor="name" className="label">
          Csoport neve <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="pl. Szerda esti foci"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="default_venue" className="label">
          Default helyszín{" "}
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            (opcionális)
          </span>
        </label>
        <input
          id="default_venue"
          name="default_venue"
          type="text"
          placeholder="pl. Sportcsarnok Pécs"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="default_schedule" className="label">
          Default menetrend{" "}
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            (opcionális)
          </span>
        </label>
        <input
          id="default_schedule"
          name="default_schedule"
          type="text"
          placeholder="pl. minden szerda 18:00"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="default_venue_fee" className="label">
          Default terembérlési díj (Ft){" "}
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            (opcionális)
          </span>
        </label>
        <input
          id="default_venue_fee"
          name="default_venue_fee"
          type="number"
          min="0"
          step="1"
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

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
        style={{ width: "100%", textAlign: "center" }}
      >
        {isPending ? "Létrehozás..." : "Csoport létrehozása"}
      </button>
    </form>
  );
}
