import { PageTheme } from "@/components/layout/page-theme";

export default function MatchDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTheme
        backgroundColor="#08041a"
        gridColor="rgba(100, 140, 255, 0.03)"
      />
      {children}
    </>
  );
}
