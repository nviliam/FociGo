import { notFound } from "next/navigation";
import { getMatchByPublicToken } from "@/actions/match-actions";

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

  const rsvpDeadlineFormatted = match.rsvp_deadline
    ? new Date(match.rsvp_deadline).toLocaleString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const rsvpExpired =
    match.rsvp_deadline && new Date(match.rsvp_deadline) < new Date();

  const venueFeeFormatted =
    match.venue_fee > 0
      ? `${match.venue_fee.toLocaleString("hu-HU")} Ft`
      : "Ingyenes";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
        {/* FociGo brand */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-green-700">⚽ FociGo</span>
          <p className="text-gray-500 text-sm mt-1">Meccs részletei</p>
        </div>

        {/* Meccs adatok */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Helyszín
            </p>
            <p className="text-gray-900 font-medium text-lg">{match.venue}</p>
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

        {/* RSVP szekció — Epic 5-ben feltöltendő */}
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 px-5 py-6 text-center space-y-3">
          <p className="text-gray-500 font-medium">Visszajelzők</p>
          <p className="text-gray-400 text-sm">
            A visszajelzések hamarosan itt jelennek meg.
          </p>
        </div>

        {/* Login CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 text-center space-y-3">
          <p className="text-gray-700 font-medium">
            Részese vagy te is a meccsnek?
          </p>
          <p className="text-gray-500 text-sm">
            Jelentkezz be, hogy visszajelzést adhass.
          </p>
          <a
            href="/login"
            className="inline-block bg-green-600 text-white rounded-xl px-6 py-2.5 font-medium hover:bg-green-700 transition-colors"
          >
            Bejelentkezés
          </a>
        </div>
      </div>
    </div>
  );
}
