import Link from "next/link";
import CreateGroupForm from "@/components/features/create-group-form";

export default function NewGroupPage() {
  return (
    <div className="page-wrapper" style={{ maxWidth: "36rem" }}>
      <Link
        href="/groups"
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
        }}
      >
        ← Csoportok
      </Link>
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          marginBottom: "0.4rem",
        }}
      >
        Új csoport
      </h1>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "1.75rem",
        }}
      >
        <CreateGroupForm />
      </div>
    </div>
  );
}
