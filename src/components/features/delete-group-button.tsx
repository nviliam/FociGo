"use client";

import { useState, useTransition } from "react";
import { deleteGroup } from "@/actions/group-actions";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  groupId: string;
  groupName: string;
};

export function DeleteGroupButton({ groupId, groupName }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Biztosan törlöd a(z) "${groupName}" csoportot?\n\nEz törli az összes meccset és visszajelzést is. A művelet nem visszavonható.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleClick}
        disabled={isPending}
        title="Csoport törlése"
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.08)",
          padding: "0.25rem 0.6rem",
          borderRadius: "0.5rem",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {isPending ? (
          <>
            <Spinner size="0.75rem" /> Törlés...
          </>
        ) : (
          "🗑 Törlés"
        )}
      </button>
      {error && (
        <p
          style={{
            fontSize: "0.72rem",
            color: "#ef4444",
            marginTop: "0.3rem",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
