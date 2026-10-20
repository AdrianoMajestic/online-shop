import { requireRole } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminDeliveryContent } from "@/components/admin/AdminDeliveryContent";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Управление доставкой и оплатой | Админка «Кабачок»",
  description: "Настройка тарифов доставки и способов оплаты",
};

export default async function AdminDeliveryPage() {
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
      <AdminDeliveryContent />
    </div>
  );
}
