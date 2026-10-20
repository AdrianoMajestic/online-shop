import { requireRole } from "@/lib/rbac";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";

export const dynamic = "force-dynamic";

interface AdminOrderDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: AdminOrderDetailPageProps) {
  return {
    title: `Заказ ${params.id} | Панель управления`,
    description: "Просмотр карточки заказа, состава товаров и управление статусом",
  };
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  await requireRole("admin", "manager");

  return <AdminOrderDetail orderIdOrNumber={params.id} />;
}
