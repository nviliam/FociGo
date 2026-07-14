import { PageTheme } from "@/components/layout/page-theme";

export default function GroupDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTheme
        backgroundColor="#400000"
        gridColor="rgba(255, 0, 0, 0.05)"
      />
      {children}
    </>
  );
}
