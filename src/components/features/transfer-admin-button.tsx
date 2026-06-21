"use client";

import { useState, useTransition } from "react";
import { transferAdmin } from "@/actions/group-actions";
import { Spinner } from "@/components/ui/spinner";

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
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "#f59e0b",
          border: "1px solid rgba(245,158,11,0.3)",
          background: "rgba(245,158,11,0.08)",
          padding: "0.25rem 0.6rem",
          borderRadius: "0.5rem",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "all 0.15s",
        }}
      >
        {isPending ? (
          <>
            <Spinner size="0.75rem" /> Átruházás...
          </>
        ) : (
          "Admin átruházás"
        )}
      </button>
      {error && (
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--notgoing-text)",
            marginTop: "0.3rem",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
