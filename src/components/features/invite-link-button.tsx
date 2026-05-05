"use client";

import { useState } from "react";

type Props = {
  inviteUrl: string;
};

/**
 * InviteLinkButton — meghívó link vágólapra másolása
 *
 * Client Component: a Clipboard API csak böngészőben érhető el.
 * A Server Component átadja az URL-t propként, ez a komponens
 * kezeli a kattintást és visszajelzést ad (Másolva! felirat).
 */
export function InviteLinkButton({ inviteUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: kijelölés (régi böngészők)
      prompt("Másold ki a meghívó linket:", inviteUrl);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "0.6rem 0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "monospace",
          }}
        >
          {inviteUrl}
        </span>
        <button
          onClick={handleCopy}
          className={copied ? "btn-secondary" : "btn-primary"}
          style={{
            flexShrink: 0,
            fontSize: "0.78rem",
            padding: "0.4rem 0.85rem",
          }}
        >
          {copied ? "✓ Másolva!" : "Másolás"}
        </button>
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
        Ezt a linket küld el a barátaidnak. Megnyitva automatikusan csatlakoznak
        a csoporthoz.
      </p>
    </div>
  );
}
