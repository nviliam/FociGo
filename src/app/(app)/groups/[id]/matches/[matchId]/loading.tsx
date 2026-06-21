import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
        gap: "0.75rem",
        color: "var(--text-secondary)",
        fontSize: "0.85rem",
      }}
    >
      <Spinner size="1.25rem" />
      <span>Betöltés...</span>
    </div>
  );
}
