export default function CheckEmailPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
          }}
        >
          Ellenőrizd az emailedet!
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          Küldünk egy bejelentkezési linket. Kattints rá a belépéshez — a link
          24 óráig érvényes.
        </p>
        <a
          href="/login"
          style={{
            fontSize: "0.85rem",
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          ← Vissza a bejelentkezéshez
        </a>
      </div>
    </div>
  );
}
