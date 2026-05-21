"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { RsvpStatus } from "@/types";

type RsvpEntry = {
  id: string;
  match_id: string;
  user_id: string;
  status: RsvpStatus;
  users: { nickname: string } | null;
};

type GuestRsvpEntry = {
  id: string;
  match_id: string;
  guest_name: string;
  status: RsvpStatus;
};

type Props = {
  matchId: string;
  venueFee: number; // terembér fillérben
  initialRsvps: RsvpEntry[]; // szerver oldali initial adat
  initialGuestRsvps: GuestRsvpEntry[]; // vendég visszajelzések
  currentUserId: string | null; // aktuális user — saját bejegyzés kiemeléshez
  isDeadlinePassed: boolean; // határidő lejárt-e
};

/**
 * RsvpList — valós idejű RSVP lista és árkalkulátor
 *
 * Mi a különbség a meccs detail Server Component-ben lévő listától?
 * A Server Component statikus — csak az oldal betöltésekor frissül.
 * Ez a Client Component Supabase Realtime subscription-t használ,
 * tehát más tagok visszajelzései azonnal megjelennek, oldal-újratöltés nélkül.
 *
 * Hogyan működik a Supabase Realtime?
 * 1. A böngészőben egy WebSocket kapcsolatot nyit a Supabase felé
 * 2. Feliratkozunk az `rsvps` tábla változásaira a `match_id` filter alapján
 * 3. Ha valaki INSERT/UPDATE/DELETE-t végez az rsvps táblán →
 *    a szerver elküldi az új adatot a WebSocket-en keresztül
 * 4. A komponens frissíti az állapotát az új adattal
 *
 * Miért createBrowserClient és nem createClient?
 * A `createClient` (server.ts) server-side Supabase klienst hoz létre,
 * ami a Next.js cookies() API-t használja — ez csak szerveren fut.
 * A `createBrowserClient` böngészőben fut, a localStorage-ból/cookie-ból
 * olvassa a session tokent — ez szükséges a WebSocket auth-hoz is.
 *
 * Árkalkulátor (Story 5.3):
 * fejenkénti ár = terembér ÷ "going" visszajelzők száma
 * Math.ceil() → felfelé kerekítés (pl. 3333.33 → 3334 Ft)
 * Ha nincs "going" → "–" jelenik meg (nem oszt nullával)
 *
 * Lejárt határidő + rögzített ár (Story 5.3 AC):
 * Ha az RSVP határidő lejárt, az ár "rögzített" badge-et kap.
 * A realtime subscription ilyenkor is fut — de az RLS policy
 * INSERT/UPDATE-et blokkolja lejárt határidő után, tehát az ár
 * gyakorlatilag nem változik. Ez a vizuális jelzés a usernek.
 */
export function RsvpList({
  matchId,
  venueFee,
  initialRsvps,
  initialGuestRsvps,
  currentUserId,
  isDeadlinePassed,
}: Props) {
  const [rsvps, setRsvps] = useState<RsvpEntry[]>(initialRsvps);
  const [guestRsvps, setGuestRsvps] =
    useState<GuestRsvpEntry[]>(initialGuestRsvps);

  useEffect(() => {
    // Supabase Browser kliens — env változók az .env.local-ból
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    /**
     * Realtime subscription beállítása
     *
     * .channel() — egyedi csatorna neve (match_id-vel egyedi)
     * .on("postgres_changes") — PostgreSQL tábla változások figyelése
     *   - event: "*" → INSERT, UPDATE, DELETE mind
     *   - schema: "public"
     *   - table: "rsvps"
     *   - filter: csak az adott meccs RSVP-i
     */
    const channel = supabase
      .channel(`rsvps-match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          /**
           * Miért nem frissítjük az állapotot közvetlenül a payload-ból?
           * A Realtime payload tartalmaz ugyan egy `new` rekordot,
           * de NEM tartalmaz joined adatokat (pl. users.nickname).
           * Ezért minden változásnál újralekérjük a teljes RSVP listát
           * a Supabase-ből (egyszerű SELECT).
           *
           * Alternatíva lenne a teljes kliens-oldali state kezelés,
           * de az bonyolultabb és több edge case-t kellene kezelni
           * (ki adott hozzá, ki törölte, mi volt a régi érték stb.)
           */
          console.log("Realtime RSVP változás:", payload.eventType);

          // Friss lista lekérése — joined users.nickname-mel
          const { data } = await supabase
            .from("rsvps")
            .select("id, match_id, user_id, status, users(nickname)")
            .eq("match_id", matchId)
            .order("created_at", { ascending: true });

          if (data) {
            setRsvps(
              data as unknown as Array<{
                id: string;
                match_id: string;
                user_id: string;
                status: RsvpStatus;
                users: { nickname: string } | null;
              }>,
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_rsvps",
          filter: `match_id=eq.${matchId}`,
        },
        async () => {
          // Vendég RSVP változás — friss lista lekérése
          const { data } = await supabase
            .from("guest_rsvps")
            .select("id, match_id, guest_name, status")
            .eq("match_id", matchId)
            .order("created_at", { ascending: true });

          if (data) {
            setGuestRsvps(data as GuestRsvpEntry[]);
          }
        },
      )
      .subscribe();

    // Cleanup: leiratkozás komponens unmount-kor
    // Ez megakadályozza a memory leak-et és a felesleges WebSocket kapcsolatot
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Számítások — tagok + vendégek együtt
  const goingCount =
    rsvps.filter((r) => r.status === "going").length +
    guestRsvps.filter((r) => r.status === "going").length;
  const notGoingCount =
    rsvps.filter((r) => r.status === "not_going").length +
    guestRsvps.filter((r) => r.status === "not_going").length;
  const totalCount = rsvps.length + guestRsvps.length;
  const pricePerPerson =
    goingCount > 0 && venueFee > 0 ? Math.ceil(venueFee / goingCount) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Összesítő + árkalkulátor */}
      {(totalCount > 0 || venueFee > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            background: "rgba(0,230,118,0.05)",
            border: "1px solid var(--accent-border)",
            borderRadius: "0.75rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--going-text)", fontWeight: 700 }}>
              {goingCount} jön
            </span>
            {notGoingCount > 0 && (
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                · {notGoingCount} nem jön
              </span>
            )}
          </span>
          {venueFee > 0 && (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                }}
              >
                {pricePerPerson != null
                  ? `${pricePerPerson.toLocaleString("hu-HU")} Ft / fő`
                  : "– Ft / fő"}
              </span>
              {isDeadlinePassed && (
                <span className="badge-going">Végleges ár</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* RSVP lista */}
      {totalCount === 0 ? (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            textAlign: "center",
            padding: "1.5rem 0",
          }}
        >
          Még senki nem jelzett vissza.
        </p>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column" }}>
          {rsvps.map((rsvp, i) => (
            <li
              key={rsvp.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}
              >
                {rsvp.users?.nickname ?? "Ismeretlen"}
                {rsvp.user_id === currentUserId && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      marginLeft: "0.3rem",
                    }}
                  >
                    (én)
                  </span>
                )}
              </span>
              {rsvp.status === "going" ? (
                <span className="badge-going">✓ Jövök</span>
              ) : (
                <span className="badge-notgoing">✗ Nem jövök</span>
              )}
            </li>
          ))}
          {guestRsvps.map((rsvp, i) => (
            <li
              key={rsvp.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0",
                borderTop:
                  rsvps.length > 0 || i > 0
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <span
                style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}
              >
                {rsvp.guest_name}
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    marginLeft: "0.3rem",
                  }}
                >
                  (vendég)
                </span>
              </span>
              {rsvp.status === "going" ? (
                <span className="badge-going">✓ Jövök</span>
              ) : (
                <span className="badge-notgoing">✗ Nem jövök</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
