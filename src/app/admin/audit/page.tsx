import { requireRole } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAuditContent } from "@/components/admin/AdminAuditContent";
import { getAuditLogs, AuditLogsQuery } from "@/services/audit";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Журнал аудита | Админка «Кабачок»",
  description: "Аудит ключевых действий, изменения статусов заказов, цен, остатков и прав пользователей",
};

interface AdminAuditPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
  }>;
}

export default async function AdminAuditPage({
  searchParams,
}: AdminAuditPageProps) {
  const sessionData = await requireRole("admin");
  const user = sessionData.user as {
    name?: string;
    email?: string;
    role?: string;
    id?: string;
    _id?: string;
  };

  const resolvedSearchParams = await searchParams;

  const query: AuditLogsQuery = {
    page: resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1,
    limit: resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit, 10) : 20,
    action: resolvedSearchParams.action || undefined,
    entity: resolvedSearchParams.entity || undefined,
    startDate: resolvedSearchParams.startDate || undefined,
    endDate: resolvedSearchParams.endDate || undefined,
    q: resolvedSearchParams.q || undefined,
  };

  const result = await getAuditLogs(query);

  return (
    <div className="space-y-6">
      <AdminNav
        userRole={user.role}
        userName={user.name}
        userEmail={user.email}
      />
      <AdminAuditContent initialData={result} />
    </div>
  );
}
