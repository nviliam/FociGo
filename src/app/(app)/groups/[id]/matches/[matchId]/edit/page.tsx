import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/actions/match-actions";
import { getGroupById } from "@/actions/group-actions";
import EditMatchForm from "@/components/features/edit-match-form";

type Props = {
  params: Promise<{ id: string; matchId: string }>;
};

/**
 * Meccs szerkesztés oldal
 *
 * Route: /groups/[id]/matches/[matchId]/edit
 *
 * Szerver oldali feladatok:
 * 1. Lekéri a meccset és ellenőrzi, hogy létezik-e
 * 2. Ellenőrzi, hogy a bejelentkezett user admin-e
 *    Ha nem admin → redirect a detail oldalra (AC5)
 * 3. Átadja a meccs adatait az EditMatchForm-nak előtöltéshez
 *
 * Miért redirect és nem notFound()?
 * A nem-admin user tudja, hogy a meccs létezik (látja a detail oldalon),
 * de nem szerkesztheti. A redirect kevésbé félrevezető mint a 404.
 */
export default async function EditMatchPage({ params }: Props) {
  const { id: groupId, matchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Párhuzamos lekérés
  const [match, group] = await Promise.all([
    getMatchById(matchId),
    getGroupById(groupId),
  ]);

  if (!match || !group) notFound();

  // Admin ellenőrzés — nem admin nem szerkeszthet (AC5)
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership?.is_admin) {
    redirect(`/groups/${groupId}/matches/${matchId}`);
  }

  return (
    <div style={{ maxWidth: "36rem", margin: "0 auto", padding: "2rem 1rem" }}>
      <a
        href={`/groups/${groupId}/matches/${matchId}`}
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
        }}
      >
        ← Vissza a meccshez
      </a>
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          marginBottom: "0.25rem",
        }}
      >
        Meccs szerkesztése
      </h1>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          marginBottom: "2rem",
        }}
      >
        {group.name}
      </p>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.75rem",
        }}
      >
        <EditMatchForm groupId={groupId} match={match} />
      </div>
    </div>
  );
}
