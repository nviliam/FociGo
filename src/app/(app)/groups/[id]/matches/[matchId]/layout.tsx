export default function MatchDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        body {
          background-color: #060416;
          background-image:
            linear-gradient(rgba(80, 140, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(80, 140, 255, 0.025) 1px, transparent 1px);
        }
      `}</style>
      {children}
    </>
  );
}
