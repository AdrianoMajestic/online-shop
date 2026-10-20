import { getSession } from "@/lib/rbac";
import { Shield, Users, Package, ShoppingCart, Tag } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const sessionData = await getSession();
  const user = sessionData?.user as {
    name?: string;
    email?: string;
    role?: string;
    assignedCategoryIds?: string[];
  } | undefined;

  const role = user?.role || "manager";
  const roleLabel = role === "admin" ? "Главный администратор" : "Менеджер каталога";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Панель управления
            </h1>
            <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-950/80 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {roleLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Добро пожаловать, {user?.name || user?.email}! Вы вошли в систему управления магазином «Кабачок».
          </p>
        </div>

        <Link
          href="/account"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted/70 text-sm font-medium transition-colors"
        >
          <span>В профиль покупателя</span>
        </Link>
      </div>

      {/* Role Notice */}
      {role === "manager" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Ограничение доступа менеджера (D-001 / A-09):</p>
          <p className="mt-0.5 text-xs leading-relaxed">
            Вы имеете доступ к просмотру заказов и редактированию товаров только в назначенных категориях.
            Назначено категорий: {user?.assignedCategoryIds?.length || 0}.
          </p>
        </div>
      )}

      {/* Navigation cards for future tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/products"
          id="admin-dashboard-products-card"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-emerald-500/50 hover:shadow-md transition-all group block"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Товары
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                Перейти →
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Управление ассортиментом, ценами и остатками
            </p>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          id="admin-dashboard-orders-card"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-blue-500/50 hover:shadow-md transition-all group block"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Заказы
              </h3>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                Перейти →
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Статусы, обработка и складская компенсация
            </p>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Категории и скидки</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Справочники и промокоды (T11)
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            {role === "admin" ? <Users className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {role === "admin" ? "Пользователи" : "Журнал аудита"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {role === "admin" ? "Управление ролями (T11)" : "Аудит действий (T12)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
