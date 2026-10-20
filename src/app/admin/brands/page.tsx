import { requireRole } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBrandsContent } from "@/components/admin/AdminBrandsContent";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Управление брендами | Админка «Кабачок»",
  description: "Справочник брендов и производителей товаров",
};

export default async function AdminBrandsPage() {
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
      <AdminBrandsContent />
    </div>
  );
}
