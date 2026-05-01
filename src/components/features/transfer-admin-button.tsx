"use client";

import { useState, useTransition } from "react";
import { transferAdmin } from "@/actions/group-actions";

type Props = {
  groupId: string;
  targetUserId: string;
  targetNickname: string;
};

/**
 * TransferAdminButton — Admin átruházás megerősítő gomb
 *
 * Miért Client Component?
 * - `window.confirm()` csak böngészőben érhető el
 * - `useTransition()` hook kell a pending állapot kezeléshez
 *
 * Miért useTransition és nem useState(isPending)?
 * A `useTransition` a Next.js/React ajánlott megközelítése Server Action
 * hívásoknál. A `startTransition` jelzi a React-nak, hogy ez egy
 * háttér-frissítés — a UI közben reszponzív marad.
 */
export function TransferAdminButton({
  groupId,
  targetUserId,
  targetNickname,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Megerősítő dialog — egyszerű, de hatásos
    const confirmed = window.confirm(
      `Biztosan átadod az admin szerepkört ${targetNickname}-nek?\n\nEzután te már nem leszel admin ebben a csoportban.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await transferAdmin(groupId, targetUserId);
      if (result?.error) {
        setError(result.error);
      }
      // Siker esetén a Server Action revalidatePath-et hív →
      // a Server Component újratöltődik, az oldal frissül
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Átruházás..." : "Admin átruházás"}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
