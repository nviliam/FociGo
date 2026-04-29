export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Ellenőrizd az emailedet!
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Küldtünk egy bejelentkezési linket. Kattints rá a belépéshez — a link
          24 óráig érvényes.
        </p>
        <a href="/login" className="text-sm text-green-600 hover:underline">
          ← Vissza a bejelentkezéshez
        </a>
      </div>
    </div>
  );
}
