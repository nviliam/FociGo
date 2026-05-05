import Link from "next/link";
import { getUserGroups } from "@/actions/group-actions";

export default async function GroupsPage() {
  const memberships = await getUserGroups();

  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Fejléc */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            Csoportjaim
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              marginTop: "0.2rem",
            }}
          >
            {memberships.length} csoport
          </p>
        </div>
        <Link
          href="/groups/new"
          className="btn-primary"
          style={{
            textDecoration: "none",
            display: "inline-block",
            padding: "0.6rem 1.25rem",
            fontSize: "0.85rem",
          }}
        >
          + Új csoport
        </Link>
      </div>

      {/* Csoportlista */}
      {memberships.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>
            ⚽
          </div>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            Még nincs csoportod
          </p>
          <p style={{ fontSize: "0.85rem" }}>
            Hozz létre egyet, vagy kérj meghívót egy admintól.
          </p>
        </div>
      ) : (
        <ul
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {memberships.map((m) => {
            const group = m.groups as unknown as {
              id: string;
              name: string;
              default_venue: string | null;
              default_venue_fee: number | null;
            } | null;
            if (!group) return null;

            return (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className="card-link">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "var(--text-primary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {group.name}
                      </p>
                      {group.default_venue && (
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          📍 {group.default_venue}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "0.3rem",
                      }}
                    >
                      {group.default_venue_fee != null &&
                        group.default_venue_fee > 0 && (
                          <p
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "var(--accent)",
                            }}
                          >
                            {group.default_venue_fee.toLocaleString("hu-HU")} Ft
                          </p>
                        )}
                      {m.is_admin && (
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
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
