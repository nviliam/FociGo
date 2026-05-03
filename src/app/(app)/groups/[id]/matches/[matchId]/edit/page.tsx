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
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Fejléc */}
      <div>
        <a
          href={`/groups/${groupId}/matches/${matchId}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1 block"
        >
          ← Vissza a meccshez
        </a>
        <h1 className="text-2xl font-bold text-gray-900">Meccs szerkesztése</h1>
        <p className="text-sm text-gray-500 mt-1">{group.name}</p>
      </div>

      {/* Szerkesztő form — előtöltve a jelenlegi meccs adataival */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <EditMatchForm groupId={groupId} match={match} />
      </div>
    </div>
  );
}
