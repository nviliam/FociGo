import { notFound } from "next/navigation";
import { getGroupById } from "@/actions/group-actions";
import { createClient } from "@/lib/supabase/server";
import CreateMatchForm from "@/components/features/create-match-form";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /groups/[id]/matches/new — Új meccs létrehozás oldal
 *
 * Server Component: lekérdezi a csoportot a default értékekhez,
 * majd átadja a CreateMatchForm Client Component-nek.
 * Az admin ellenőrzés a Server Action-ban van (AC6).
 */
export default async function NewMatchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const group = await getGroupById(id);
  if (!group) notFound();

  // Admin ellenőrzés — nem admin nem látja az oldalt
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const members =
    (group.group_members as Array<{ user_id: string; is_admin: boolean }>) ??
    [];
  const isAdmin =
    members.find((m) => m.user_id === user?.id)?.is_admin ?? false;

  if (!isAdmin) notFound();

  const g = group as {
    name: string;
    default_venue?: string | null;
    default_venue_fee?: number | null;
  };

  return (
    <div style={{ maxWidth: "36rem", margin: "0 auto", padding: "2rem 1rem" }}>
      <a
        href={`/groups/${id}`}
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
        }}
      >
        ← {g.name}
      </a>
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          marginBottom: "0.4rem",
        }}
      >
        Új meccs
      </h1>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          marginBottom: "2rem",
        }}
      >
        A csoport default értékei előtöltve — minden mező felülírható.
      </p>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.75rem",
        }}
      >
        <CreateMatchForm
          groupId={id}
          defaultVenue={g.default_venue}
          defaultVenueFee={g.default_venue_fee}
        />
      </div>
    </div>
  );
}
