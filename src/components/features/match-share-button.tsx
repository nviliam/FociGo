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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
        <span className="text-sm text-gray-600 truncate flex-1 font-mono">
          {matchUrl}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          {copied ? "✓ Másolva!" : "Link másolása"}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Ez a link bejelentkezés nélkül is megtekinthető. Küldd el WhatsApp-on!
      </p>
    </div>
  );
}
