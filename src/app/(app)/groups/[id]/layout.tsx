import { PageTheme } from "@/components/layout/page-theme";

export default function GroupDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTheme
        backgroundColor="#031510"
        gridColor="rgba(0, 230, 118, 0.03)"
      />
      {children}
    </>
  );
}
