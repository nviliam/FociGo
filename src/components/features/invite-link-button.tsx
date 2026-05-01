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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
        <span className="text-sm text-gray-600 truncate flex-1 font-mono">
          {inviteUrl}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          {copied ? "✓ Másolva!" : "Másolás"}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Ezt a linket küldd el a barátaidnak. Megnyitva automatikusan
        csatlakoznak a csoporthoz.
      </p>
    </div>
  );
}
