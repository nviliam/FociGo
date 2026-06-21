"use client";

import { useState, useTransition } from "react";
import { deleteMatch } from "@/actions/match-actions";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  groupId: string;
  matchId: string;
};

export function DeleteMatchButton({ groupId, matchId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Biztosan törlöd ezt a meccset?\n\nEz törli az összes visszajelzést is. A művelet nem visszavonható.",
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteMatch(groupId, matchId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.08)",
          padding: "0.5rem 1rem",
          borderRadius: "0.75rem",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "all 0.15s",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        {isPending ? <><Spinner size="0.8rem" /> Törlés...</> : "🗑 Törlés"}
      </button>
      {error && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "#ef4444",
            marginTop: "0.5rem",
            textAlign: "right",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
