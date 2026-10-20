import { requireRole } from "@/lib/rbac";
import { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionData = await requireRole("admin", "manager");
  const user = sessionData?.user as {
    name?: string;
    email?: string;
    role?: string;
    assignedCategoryIds?: string[];
  } | undefined;

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <AdminNav
        userRole={user?.role}
        userName={user?.name}
        userEmail={user?.email}
        assignedCategoryCount={user?.assignedCategoryIds?.length || 0}
      />
      {children}
    </div>
  );
}
