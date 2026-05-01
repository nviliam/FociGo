import { notFound } from "next/navigation";
import Link from "next/link";
import { getGroupById } from "@/actions/group-actions";
import { createClient } from "@/lib/supabase/server";
import { InviteLinkButton } from "@/components/features/invite-link-button";
import { TransferAdminButton } from "@/components/features/transfer-admin-button";

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

  const group = await getGroupById(id);
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Vissza gomb */}
      <Link
        href="/groups"
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-1"
      >
        ← Csoportok
      </Link>

      {/* Csoport fejléc */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {group.name as string}
            </h1>
            {(group as { default_venue?: string }).default_venue && (
              <p className="text-gray-500 text-sm mt-1">
                📍 {(group as { default_venue?: string }).default_venue}
              </p>
            )}
            {(group as { default_schedule?: string }).default_schedule && (
              <p className="text-gray-500 text-sm mt-1">
                🕐 {(group as { default_schedule?: string }).default_schedule}
              </p>
            )}
            <p className="text-gray-500 text-sm mt-1">
              💰 Terembér: {venueFeeDisplay}
            </p>
          </div>
          {isAdmin && (
            <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Meghívó link — csak adminnak */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Meghívó link
          </h2>
          <InviteLinkButton inviteUrl={inviteUrl} />
        </div>
      )}

      {/* Tagok listája */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Tagok ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-gray-400 text-sm">Nincsenek tagok.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between py-3"
              >
                <span className="text-gray-700 font-medium">
                  {member.users?.nickname ?? "Ismeretlen"}
                  {member.user_id === user?.id && (
                    <span className="text-xs text-gray-400 ml-1">(én)</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {member.is_admin && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Admin
                    </span>
                  )}
                  {/* Admin átruházás gomb — csak az adminnak, saját maga kivételével */}
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
    </div>
  );
}
