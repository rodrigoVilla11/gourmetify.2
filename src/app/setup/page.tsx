import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const count = await prisma.user.count({ where: { role: "SUPERADMIN" } });
  if (count > 0) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="text-4xl">🍽️</div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración inicial</h1>
            <p className="text-sm text-gray-500">Creá la cuenta superadmin del sistema</p>
          </div>
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
