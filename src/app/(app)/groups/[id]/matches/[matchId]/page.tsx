import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/actions/match-actions";
import { getGroupById } from "@/actions/group-actions";
import {
  getRsvpsByMatch,
  getGuestRsvpsByMatchPublic,
} from "@/actions/rsvp-actions";
import { MatchShareButton } from "@/components/features/match-share-button";
import { RsvpButtons } from "@/components/features/rsvp-buttons";
import { RsvpList } from "@/components/features/rsvp-list";
import { DeleteMatchButton } from "@/components/features/delete-match-button";
import type { RsvpStatus } from "@/types";

type Props = {
  params: Promise<{ id: string; matchId: string }>;
};

/**
 * Meccs detail oldal
 *
 * Route: /groups/[id]/matches/[matchId]
 *
 * Mit csinál ez az oldal?
 * 1. Lekéri a meccset és a csoportot párhuzamosan (Promise.all)
 * 2. Megmutatja a meccs adatait (helyszín, dátum, terembér, RSVP határidő)
 * 3. Admin esetén "Szerkesztés" linket jelenít meg
 * 4. Előkészíti az Epic 5 RSVP funkcióját (hely foglalva)
 *
 * Miért Server Component?
 * Az adatlekérés és az admin ellenőrzés szerveren fut, nem kell client-side
 * fetch-et csinálni. A Supabase auth session csak szerveroldalon érhető el
 * biztonságosan (httpOnly cookie).
 */
export default async function MatchDetailPage({ params }: Props) {
  const { id: groupId, matchId } = await params;

  // Párhuzamos lekérés — gyorsabb mint egymás után
  const [match, group, rsvps, guestRsvps] = await Promise.all([
    getMatchById(matchId),
    getGroupById(groupId),
    getRsvpsByMatch(matchId),
    getGuestRsvpsByMatchPublic(matchId),
  ]);

  if (!match || !group) notFound();

  // Admin ellenőrzés a "Szerkesztés" gomb megjelenítéséhez
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = user
    ? await supabase
        .from("group_members")
        .select("is_admin")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const isAdmin = membership?.is_admin === true;

  // Saját RSVP státusz kinyerése
  const myRsvp = user ? rsvps.find((r) => r.user_id === user.id) : null;
  const myRsvpStatus: RsvpStatus | null = myRsvp?.status ?? null;

  // Tagság ellenőrzés (RSVP gombok megjelenítéséhez)
  const isMember = !!membership;

  // Nyilvános meccs URL összeállítása
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const matchPublicUrl = `${baseUrl}/match/${match.public_token}`;

  // Dátum formázás — helyi időzónában, olvasható formátumban
  const matchDateFormatted = new Date(match.match_date).toLocaleString(
    "hu-HU",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  // Terembér Ft-ban
  const venueFeeFormatted =
    match.venue_fee > 0
      ? `${match.venue_fee.toLocaleString("hu-HU")} Ft`
      : "Ingyenes";

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      {/* Fejléc */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <Link
            href={`/groups/${groupId}`}
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              display: "block",
              marginBottom: "0.35rem",
            }}
          >
            ← {group.name}
          </Link>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            ⚽ Meccs
          </h1>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              href={`/groups/${groupId}/matches/${matchId}/edit`}
              className="btn-secondary"
              style={{
                fontSize: "0.82rem",
                padding: "0.5rem 1rem",
                textDecoration: "none",
              }}
            >
              ✏️ Szerkesztés
            </Link>
            <DeleteMatchButton groupId={groupId} matchId={matchId} />
          </div>
        )}
      </div>

      {/* Meccs adatok kártya */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          overflow: "hidden",
        }}
      >
        {/* Helyszín — Google Maps link */}
        <div style={{ padding: "1rem 1.25rem" }}>
          <p
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginBottom: "0.3rem",
            }}
          >
            Helyszín
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontWeight: 600,
              color: "var(--accent)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            📍 {match.venue}
          </a>
        </div>

        {[
          { label: "Időpont", value: matchDateFormatted },
          {
            label: "Teljes bérleti díj",
            value: venueFeeFormatted,
            accent: match.venue_fee > 0,
          },
        ].map((row, i) => (
          <div
            key={row.label}
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: "0.3rem",
              }}
            >
              {row.label}
            </p>
            <p
              style={{
                fontWeight: 600,
                color: row.accent ? "var(--accent)" : "var(--text-primary)",
              }}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>

      {/* RSVP szekció */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Visszajelzések
        </h2>

        {isMember && (
          <RsvpButtons matchId={matchId} initialStatus={myRsvpStatus} />
        )}

        <RsvpList
          matchId={matchId}
          venueFee={match.venue_fee}
          initialRsvps={rsvps}
          initialGuestRsvps={guestRsvps}
          currentUserId={user?.id ?? null}
        />
      </div>

      {/* Meccs link megosztása */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.25rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.75rem",
          }}
        >
          📤 Meccs link megosztása
        </h2>
        <MatchShareButton matchUrl={matchPublicUrl} />
      </div>
    </div>
  );
}
