import Link from "next/link";
import { getUserGroups } from "@/actions/group-actions";

export default async function GroupsPage() {
  const memberships = await getUserGroups();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Fejléc */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Csoportjaim</h1>
          <Link
            href="/groups/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            + Új csoport
          </Link>
        </div>

        {/* Csoportlista */}
        {memberships.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Még nincs csoportod</p>
            <p className="text-sm">
              Hozz létre egyet, vagy kérj meghívót egy adminisztrátortól.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
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
                  <Link
                    href={`/groups/${group.id}`}
                    className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-green-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {group.name}
                        </p>
                        {group.default_venue && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            📍 {group.default_venue}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {group.default_venue_fee != null && (
                          <p className="text-sm font-medium text-gray-700">
                            {group.default_venue_fee} Ft
                          </p>
                        )}
                        {m.is_admin && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
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
    </div>
  );
}
