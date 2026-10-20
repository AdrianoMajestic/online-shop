import { requireAuth, getSession } from "@/lib/rbac";
import { getUserOrderById } from "@/services/account.service";
import { OrderDetailContent } from "@/components/account/OrderDetailContent";
import { notFound } from "next/navigation";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  // Strict server-side authentication guard
  await requireAuth({ redirectTo: `/account/orders/${params.id}` });
  const sessionData = await getSession();
  const userId = sessionData!.user.id;

  let order;
  try {
    order = await getUserOrderById(params.id, userId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    if (error instanceof ForbiddenError) {
      // User is trying to access another user's order: return 403 Forbidden
      return (
        <div className="py-16 text-center space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 max-w-md mx-auto">
            <h2 className="text-lg font-bold">Доступ запрещен (403)</h2>
            <p className="text-sm mt-1">
              У вас нет прав для просмотра этого заказа. Вы можете просматривать только собственные заказы.
            </p>
          </div>
        </div>
      );
    }
    throw error;
  }

  // Convert Mongoose doc to plain JSON for client component
  const plainOrder = JSON.parse(JSON.stringify(order));

  return <OrderDetailContent initialOrder={plainOrder} />;
}
