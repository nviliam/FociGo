import { PageTheme } from "@/components/layout/page-theme";

export default function MatchDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTheme
        backgroundColor="#060416"
        gridColor="rgba(80, 140, 255, 0.025)"
      />
      {children}
    </>
  );
}
