import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { effectivePlan, type Plan } from "@/lib/plans";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  let orgName: string | undefined;
  let orgSlug: string | undefined;
  if (session.organizationId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: session.organizationId },
        select: { name: true, slug: true },
      });
      orgName = org?.name ?? undefined;
      orgSlug = org?.slug ?? undefined;
    } catch {
      // DB temporarily unavailable — continue without org name
    }
  }

  // Derive effective plan from JWT (no extra DB query)
  const orgPlan: Plan = session.plan
    ? effectivePlan(session.plan as Plan, session.planExpiresAt ?? null)
    : "FREE";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={session.role} username={session.username} orgName={orgName} plan={orgPlan} orgSlug={orgSlug} />
      {/* pt-14 = mobile top bar height; removed on lg+ */}
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
