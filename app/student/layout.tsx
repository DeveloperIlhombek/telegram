export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--tg-secondary-bg)",
        overflow: "hidden",
      }}
    >
      <div
        className="scroll-area"
        style={{ flex: 1, overflowY: "auto" }}
      >
        {children}
      </div>
    </div>
  );
}
