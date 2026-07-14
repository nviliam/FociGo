export default function GroupDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        body {
          background-color: #031510;
          background-image:
            linear-gradient(rgba(0, 230, 118, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 230, 118, 0.03) 1px, transparent 1px);
        }
      `}</style>
      {children}
    </>
  );
}
