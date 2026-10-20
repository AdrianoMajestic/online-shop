import { requireRole } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUsersContent } from "@/components/admin/AdminUsersContent";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Управление пользователями | Админка «Кабачок»",
  description: "Роли, блокировка пользователей и назначение категорий менеджерам",
};

export default async function AdminUsersPage() {
  const sessionData = await requireRole("admin");
  const user = sessionData.user as {
    name?: string;
    email?: string;
    role?: string;
    id?: string;
    _id?: string;
  };

  const currentAdminId = user.id || user._id?.toString() || "";

  return (
    <div className="space-y-6">
      <AdminNav
        userRole={user.role}
        userName={user.name}
        userEmail={user.email}
      />
      <AdminUsersContent
        currentAdminId={currentAdminId}
        currentAdminEmail={user.email}
      />
    </div>
  );
}
