import { PageTheme } from "@/components/layout/page-theme";

export default function GroupDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTheme backgroundColor="#041a0d" gridColor="rgba(0, 230, 118, 0.04)" />
      {children}
    </>
  );
}
