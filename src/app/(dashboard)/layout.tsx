import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={session.role} username={session.username} />
      {/* pt-14 = mobile top bar height; removed on lg+ */}
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
