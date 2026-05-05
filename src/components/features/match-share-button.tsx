"use client";

import { useState } from "react";

type Props = {
  matchUrl: string;
};

/**
 * MatchShareButton — meccs link vágólapra másolása
 *
 * Ugyanolyan Clipboard API minta mint az InviteLinkButton.
 *
 * Miért külön komponens az InviteLinkButton helyett?
 * A két gomb más kontextusban jelenik meg és más szöveget mutat.
 * Az InviteLinkButton a csoport meghívójához való — WhatsApp-on
 * csoportba hív. A MatchShareButton a meccs részleteit mutatja
 * (auth nélkül elérhető link), tehát más leírás szöveget igényel.
 */
export function MatchShareButton({ matchUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(matchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: régi böngészők (pl. régi iOS Safari)
      prompt("Másold ki a meccs linkjét:", matchUrl);
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
          {matchUrl}
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
          {copied ? "✓ Másolva!" : "Link másolása"}
        </button>
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
        Ez a link bejelentkezés nélkül is megtekinthető. Küldd el WhatsApp-on!
      </p>
    </div>
  );
}
