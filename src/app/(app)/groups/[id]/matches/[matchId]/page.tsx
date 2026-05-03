import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/actions/match-actions";
import { getGroupById } from "@/actions/group-actions";
import { MatchShareButton } from "@/components/features/match-share-button";

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
  const [match, group] = await Promise.all([
    getMatchById(matchId),
    getGroupById(groupId),
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

  const rsvpDeadlineFormatted = match.rsvp_deadline
    ? new Date(match.rsvp_deadline).toLocaleString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Lejárt-e az RSVP határidő?
  const rsvpExpired =
    match.rsvp_deadline && new Date(match.rsvp_deadline) < new Date();

  // Terembér Ft-ban
  const venueFeeFormatted =
    match.venue_fee > 0
      ? `${match.venue_fee.toLocaleString("hu-HU")} Ft`
      : "Ingyenes";

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Fejléc */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/groups/${groupId}`}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 block"
          >
            ← {group.name}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">⚽ Meccs</h1>
        </div>
        {isAdmin && (
          <Link
            href={`/groups/${groupId}/matches/${matchId}/edit`}
            className="shrink-0 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            ✏️ Szerkesztés
          </Link>
        )}
      </div>

      {/* Meccs adatok */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Helyszín
          </p>
          <p className="text-gray-900 font-medium">{match.venue}</p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Időpont
          </p>
          <p className="text-gray-900 font-medium">{matchDateFormatted}</p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Terembér
          </p>
          <p className="text-gray-900 font-medium">{venueFeeFormatted}</p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            RSVP határidő
          </p>
          {rsvpDeadlineFormatted ? (
            <div className="flex items-center gap-2">
              <p className="text-gray-900 font-medium">
                {rsvpDeadlineFormatted}
              </p>
              {rsvpExpired && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  Lejárt
                </span>
              )}
            </div>
          ) : (
            <p className="text-gray-400 italic">Nincs beállítva</p>
          )}
        </div>
      </div>

      {/* Meccs link megosztása — minden tag számára */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          📤 Meccs link megosztása
        </h2>
        <MatchShareButton matchUrl={matchPublicUrl} />
      </div>

      {/* RSVP szekció — Epic 5-ben kerül feltöltésre */}
      <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 px-5 py-6 text-center">
        <p className="text-gray-400 text-sm">
          Visszajelzés hamarosan elérhető lesz (Epic 5)
        </p>
      </div>
    </div>
  );
}
