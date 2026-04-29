import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateNickname } from "@/actions/auth-actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SetupPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ha mar van nickname, nincs szukseg a setup oldalra
  const { data: profile } = await supabase
    .from("users")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (profile?.nickname) {
    redirect("/groups");
  }

  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-600 mb-2">FociGo</h1>
          <p className="text-gray-500 text-sm">Majdnem kesz!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
            Valassz nicknevet!
          </h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            Ez a nev fog megjelenni a csoportodban az RSVP-listaban. (2-30
            karakter)
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 text-center">
              {error === "save_failed"
                ? "Mentes sikertelen. Kerem probald ujra."
                : decodeURIComponent(error)}
            </div>
          )}

          <form action={updateNickname} className="flex flex-col gap-3">
            <label
              htmlFor="nickname"
              className="text-sm font-medium text-gray-700"
            >
              Nickname
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder="pl. Kovacs Jani"
              minLength={2}
              maxLength={30}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
            >
              Mentes es tovabb
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
