import { requireAuth, getSession } from "@/lib/rbac";
import { getUserOrders } from "@/services/account.service";
import { OrdersList } from "@/components/account/OrdersList";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  await requireAuth({ redirectTo: "/account/orders" });
  const sessionData = await getSession();
  const userId = sessionData!.user.id;

  const orders = await getUserOrders(userId);

  // Transform Mongoose lean objects to plain JSON for client component
  const plainOrders = JSON.parse(JSON.stringify(orders));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          История заказов
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Все ваши покупки, отслеживание статусов доставки и повторный заказ
        </p>
      </div>

      <OrdersList initialOrders={plainOrders} />
    </div>
  );
}
