import Link from "next/link";
import CreateGroupForm from "@/components/features/create-group-form";

export default function NewGroupPage() {
  return (
    <div style={{ maxWidth: "36rem", margin: "0 auto", padding: "2rem 1rem" }}>
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
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          marginBottom: "2rem",
        }}
      >
        A default beállítások minden új meccsnél előtöltődnek — meccs szinten
        felülírhatók.
      </p>
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
