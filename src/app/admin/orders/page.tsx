import { requireRole } from "@/lib/rbac";
import { AdminOrdersList } from "@/components/admin/AdminOrdersList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Управление заказами | Панель управления",
  description: "Реестр заказов, статусы, обработка и складской учет",
};

export default async function AdminOrdersPage() {
  await requireRole("admin", "manager");

  return <AdminOrdersList />;
}
