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
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <a
          href={`/groups/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          ← {g.name}
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Új meccs</h1>
        <p className="text-gray-500 text-sm mt-1">
          A csoport default értékei előtöltve — minden mező felülírható.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <CreateMatchForm
          groupId={id}
          defaultVenue={g.default_venue}
          defaultVenueFee={g.default_venue_fee}
        />
      </div>
    </div>
  );
}
