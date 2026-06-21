type Props = {
  size?: string; // CSS font-size értékként, pl. "1rem", "1.25rem"
};

export function Spinner({ size = "1rem" }: Props) {
  return (
    <span
      className="spinner"
      style={{ fontSize: size }}
      aria-label="Betöltés..."
      role="status"
    />
  );
}
