import { requireRole } from "@/lib/rbac";
import { AdminProductsContent } from "@/components/admin/AdminProductsContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Управление товарами | Панель управления",
  description: "Каталог товаров, цены, остатки и разграничение прав доступа",
};

export default async function AdminProductsPage() {
  const sessionData = await requireRole("admin", "manager");
  const user = sessionData?.user as {
    role?: string;
    assignedCategoryIds?: string[];
  } | undefined;

  return (
    <AdminProductsContent
      userRole={user?.role || "manager"}
      assignedCategoryIds={user?.assignedCategoryIds || []}
    />
  );
}
