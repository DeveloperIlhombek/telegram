import { BottomNav } from "@/components/shared";

const teacherNavItems = [
  {
    path: "/teacher",
    label: "Guruhlar",
    icon: "📚",
    activeIcon: "📚",
  },
  {
    path: "/teacher/history",
    label: "Tarix",
    icon: "📅",
    activeIcon: "📅",
  },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="scroll-area"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--tg-secondary-bg)",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
      <BottomNav items={teacherNavItems} />
    </>
  );
}
