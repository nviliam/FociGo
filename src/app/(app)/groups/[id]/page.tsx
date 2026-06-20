import { notFound } from "next/navigation";
import Link from "next/link";
import { getGroupById } from "@/actions/group-actions";
import { getMatchesByGroup } from "@/actions/match-actions";
import { getRsvpCountsByGroup } from "@/actions/rsvp-actions";
import { createClient } from "@/lib/supabase/server";
import { InviteLinkButton } from "@/components/features/invite-link-button";
import { TransferAdminButton } from "@/components/features/transfer-admin-button";
import type { Match } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /groups/[id] — Csoport detail oldal
 *
 * Server Component — olvassa a csoportot + tagjait.
 * RLS garantálja, hogy csak tagok látják.
 *
 * Tartalom:
 * - Csoport neve, helyszín, menetrend, terembér
 * - Tagok listája (nickname, admin jelvény)
 * - Admin számára: meghívó link
 */
export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [group, matches, rsvpCounts] = await Promise.all([
    getGroupById(id),
    getMatchesByGroup(id),
    getRsvpCountsByGroup(id),
  ]);
  if (!group) notFound();

  // Aktuális user azonosítása (admin-e ebben a csoportban)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Saját tagság keresése
  const members =
    (group.group_members as Array<{
      user_id: string;
      is_admin: boolean;
      users: { nickname: string } | null;
    }>) ?? [];

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.is_admin ?? false;

  // Meghívó URL összeállítása
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const inviteUrl = `${baseUrl}/join/${(group as { invite_token: string }).invite_token}`;

  // Terembér Ft-ban (integer fillér → Ft osztás 100-al)
  const venueFee = (group as { default_venue_fee?: number }).default_venue_fee;
  const venueFeeDisplay = venueFee != null ? `${venueFee} Ft` : "—";

  return (
    <div className="page-wrapper" style={{ maxWidth: "44rem" }}>
      <Link
        href="/groups"
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
        }}
      >
        ← Csoportok
      </Link>

      {/* Csoport fejléc */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                marginBottom: "0.5rem",
              }}
            >
              {group.name as string}
            </h1>
            {(group as { default_venue?: string }).default_venue && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.2rem",
                }}
              >
                📍 {(group as { default_venue?: string }).default_venue}
              </p>
            )}
            {(group as { default_schedule?: string }).default_schedule && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.2rem",
                }}
              >
                🕐 {(group as { default_schedule?: string }).default_schedule}
              </p>
            )}
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              💰 Teljes bérleti díj:{" "}
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {venueFeeDisplay}
              </span>
            </p>
          </div>
          {isAdmin && (
            <span
              style={{
                flexShrink: 0,
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "var(--accent-glow)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
              }}
            >
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Tagok listája */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.5rem",
          marginBottom: "1.25rem",
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
          👥 Tagok ({members.length})
        </h2>
        {members.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Nincsenek tagok.
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {members.map((member, i) => (
              <li
                key={member.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 0",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {member.users?.nickname ?? "Ismeretlen"}
                  {member.user_id === user?.id && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginLeft: "0.35rem",
                      }}
                    >
                      (én)
                    </span>
                  )}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {member.is_admin && (
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: "var(--accent-glow)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-border)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "9999px",
                      }}
                    >
                      Admin
                    </span>
                  )}
                  {isAdmin && !member.is_admin && (
                    <TransferAdminButton
                      groupId={id}
                      targetUserId={member.user_id}
                      targetNickname={member.users?.nickname ?? "Ismeretlen"}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Meccsek listája */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            ⚽ Meccsek ({matches.length})
          </h2>
          {isAdmin && (
            <Link
              href={`/groups/${id}/matches/new`}
              className="btn-primary"
              style={{
                fontSize: "0.8rem",
                padding: "0.45rem 1rem",
                textDecoration: "none",
              }}
            >
              + Új meccs
            </Link>
          )}
        </div>

        {matches.length === 0 ? (
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              textAlign: "center",
              padding: "2rem 0",
            }}
          >
            Még nincs meccs.{" "}
            {isAdmin && (
              <Link
                href={`/groups/${id}/matches/new`}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                Hozz létre egyet!
              </Link>
            )}
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {(matches as Match[]).map((match, i) => {
              const date = new Date(match.match_date);
              const dateStr = date.toLocaleDateString("hu-HU", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              });
              const timeStr = date.toLocaleTimeString("hu-HU", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isPast = date < new Date();
              const counts = rsvpCounts.get(match.id) ?? {
                going: 0,
                notGoing: 0,
              };
              const pricePerPerson =
                counts.going > 0 && match.venue_fee > 0
                  ? Math.ceil(match.venue_fee / counts.going)
                  : null;
              return (
                <li
                  key={match.id}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <Link
                    href={`/groups/${id}/matches/${match.id}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.9rem 0.5rem",
                      textDecoration: "none",
                      borderRadius: "0.75rem",
                      transition: "background 0.15s",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: isPast
                            ? "var(--text-muted)"
                            : "var(--text-primary)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {dateStr} {timeStr}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          marginBottom: "0.3rem",
                        }}
                      >
                        📍 {match.venue}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        {counts.going > 0 && (
                          <span className="badge-going">
                            ✓ {counts.going} jön
                          </span>
                        )}
                        {counts.notGoing > 0 && (
                          <span className="badge-notgoing">
                            ✗ {counts.notGoing} nem jön
                          </span>
                        )}
                        {pricePerPerson != null && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "var(--accent)",
                            }}
                          >
                            {pricePerPerson.toLocaleString("hu-HU")} Ft/fő
                          </span>
                        )}
                      </div>
                    </div>
                    {isPast && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                        }}
                      >
                        Lejárt
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Meghívó link — csak adminnak, legalul */}
      {isAdmin && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.75rem",
            }}
          >
            🔗 Meghívó link a csoportba
          </h2>
          <InviteLinkButton inviteUrl={inviteUrl} />
        </div>
      )}
    </div>
  );
}
