import { notFound } from "next/navigation";
import Image from "next/image";
import { getMatchByPublicToken } from "@/actions/match-actions";
import {
  getRsvpsByMatchPublic,
  getGuestRsvpsByMatchPublic,
} from "@/actions/rsvp-actions";
import { GuestRsvpForm } from "@/components/features/guest-rsvp-form";

type Props = {
  params: Promise<{ token: string }>;
};

/**
 * Nyilvános meccs oldal
 *
 * Route: /match/[token]
 *
 * Miért van ez az (app) csoporton KÍVÜL?
 * Az (app) csoport összes oldala az auth middleware mögött van —
 * a middleware ellenőrzi, hogy be van-e jelentkezve a user, és ha
 * nincs, /login-ra irányít. A /match/[token] oldalnak viszont
 * bejelentkezés nélkül is elérhetőnek kell lennie.
 *
 * Az src/app/match/ könyvtár az (app) csoporttól FÜGGETLEN,
 * és a middleware PUBLIC_ROUTES tömbjében a "/match" szerepel,
 * ezért nem kér autentikációt.
 *
 * Mit mutat ez az oldal?
 * - Meccs helyszíne, dátuma, terembére, RSVP határideje
 * - Lejárt-e az RSVP határidő (badge)
 * - RSVP lista és fejenkénti ár: Epic 5-ben kerül ide
 * - Login link, ha valaki csatlakozni szeretne a csoporthoz
 *
 * Adatbiztonság:
 * Az RLS policy (002_rls_policies.sql) engedélyezi a meccs
 * olvasását public_token alapján anonymous usernek is.
 * Az Supabase anon kulcs elegendő — nincs service role szükséges.
 */
export default async function PublicMatchPage({ params }: Props) {
  const { token } = await params;

  const match = await getMatchByPublicToken(token);
  if (!match) notFound();

  // RSVP lista lekérése — auth nélkül, anon Supabase kulccsal
  const [matchRsvps, guestRsvps] = await Promise.all([
    getRsvpsByMatchPublic(match.id),
    getGuestRsvpsByMatchPublic(match.id),
  ]);

  // Összesített lista a megjelenítéshez
  type DisplayRsvp = { id: string; name: string; status: string };
  const allRsvps: DisplayRsvp[] = [
    ...matchRsvps.map((r) => ({
      id: r.id,
      name: r.users?.nickname ?? "Ismeretlen",
      status: r.status,
    })),
    ...guestRsvps.map((r) => ({
      id: r.id,
      name: r.guest_name,
      status: r.status,
    })),
  ];

  // Dátum formázás — hu-HU locale, olvasható formátum
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

  const venueFeeFormatted =
    match.venue_fee > 0
      ? `${match.venue_fee.toLocaleString("hu-HU")} Ft`
      : "Ingyenes";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div
        style={{
          maxWidth: "40rem",
          margin: "0 auto",
          padding: "3rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* FociGo brand fejléc */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div
            style={{
              marginBottom: "0.5rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Image src="/logo1.png" alt="FociGo logo" width={72} height={72} />
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--accent)",
            }}
            className="logo-text"
          >
            FociGo
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.82rem",
              marginTop: "0.2rem",
            }}
          >
            Meccs részletei
          </p>
        </div>

        {/* Meccs adatok */}
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
          ].map((row) => (
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
            gap: "0.75rem",
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

          {allRsvps.length > 0 && (
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
              <span style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--going-text)", fontWeight: 700 }}>
                  {allRsvps.filter((r) => r.status === "going").length} jön
                </span>
                {allRsvps.filter((r) => r.status === "not_going").length >
                  0 && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    · {
                      allRsvps.filter((r) => r.status === "not_going").length
                    }{" "}
                    nem jön
                  </span>
                )}
              </span>
              {match.venue_fee > 0 &&
                allRsvps.filter((r) => r.status === "going").length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        color: "var(--accent)",
                      }}
                    >
                      {Math.ceil(
                        match.venue_fee /
                          allRsvps.filter((r) => r.status === "going").length,
                      ).toLocaleString("hu-HU")}{" "}
                      Ft / fő
                    </span>
                  </div>
                )}
            </div>
          )}

          {allRsvps.length === 0 ? (
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
              {allRsvps.map((rsvp, i) => (
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
                    {rsvp.name}
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

        {/* Vendég visszajelzés */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--accent-border)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
            boxShadow: "0 0 24px var(--accent-glow)",
          }}
        >
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "1rem",
            }}
          >
            📋 Visszajelzés
          </h2>
          <GuestRsvpForm matchId={match.id} />
        </div>

        {/* Login CTA — aki csatlakozni szeretne a csoporthoz */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            padding: "1.25rem 1.5rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              marginBottom: "0.75rem",
            }}
          >
            Szeretnél csatlakozni a csoporthoz? Kérj meghívó linket az admintól.
          </p>
          <a
            href="/login"
            className="btn-secondary"
            style={{
              display: "inline-block",
              textDecoration: "none",
              fontSize: "0.85rem",
            }}
          >
            Bejelentkezés
          </a>
        </div>
      </div>
    </div>
  );
}
