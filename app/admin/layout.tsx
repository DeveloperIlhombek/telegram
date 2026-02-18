import { BottomNav } from "@/components/shared";

const adminNavItems = [
  { path: "/admin", label: "Bosh sahifa", icon: "📊", activeIcon: "📊" },
  { path: "/admin/teachers", label: "O'qituvchilar", icon: "👨‍🏫", activeIcon: "👨‍🏫" },
  { path: "/admin/students", label: "O'quvchilar", icon: "👨‍🎓", activeIcon: "👨‍🎓" },
  { path: "/admin/groups", label: "Guruhlar", icon: "📚", activeIcon: "📚" },
];

export default function AdminLayout({
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
      <BottomNav items={adminNavItems} />
    </>
  );
}
