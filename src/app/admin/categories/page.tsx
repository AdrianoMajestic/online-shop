import { requireRole } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminCategoriesContent } from "@/components/admin/AdminCategoriesContent";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Управление категориями | Админка «Кабачок»",
  description: "Дерево категорий, создание, редактирование и скрытие",
};

export default async function AdminCategoriesPage() {
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
      <AdminCategoriesContent />
    </div>
  );
}
