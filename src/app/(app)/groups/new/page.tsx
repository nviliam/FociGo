import Link from "next/link";
import CreateGroupForm from "@/components/features/create-group-form";

export default function NewGroupPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Fejléc */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/groups"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Vissza
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Új csoport</h1>
        </div>

        {/* Form kártya */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-5">
            A default beállítások automatikusan előtöltődnek minden új meccshez
            — meccs szinten felülírhatók.
          </p>
          <CreateGroupForm />
        </div>
      </div>
    </div>
  );
}
