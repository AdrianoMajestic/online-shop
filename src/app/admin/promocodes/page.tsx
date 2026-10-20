import { requireRole } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPromocodesContent } from "@/components/admin/AdminPromocodesContent";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Управление промокодами | Админка «Кабачок»",
  description: "Создание и редактирование промокодов, скидки и лимиты",
};

export default async function AdminPromocodesPage() {
  const sessionData = await requireRole("admin");
  const user = sessionData.user as {
    name?: string;
    email?: string;
    role?: string;
  };

  return (
    <div className="space-y-6">
      <AdminNav
        userRole={user.role}
        userName={user.name}
        userEmail={user.email}
      />
      <AdminPromocodesContent />
    </div>
  );
}
