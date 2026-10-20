import { getSession } from "@/lib/rbac";
import {
  Shield,
  Users,
  Package,
  ShoppingCart,
  FolderTree,
  Award,
  Truck,
  Ticket,
} from "lucide-react";
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
  const isAdmin = role === "admin";
  const roleLabel = isAdmin ? "Главный администратор" : "Менеджер каталога";

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
            Назначено категорий: {user?.assignedCategoryIds?.length || 0}. Разделы справочников и пользователей доступны главному администратору.
          </p>
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products */}
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

        {/* Orders */}
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

        {/* Categories */}
        {isAdmin ? (
          <Link
            href="/admin/categories"
            id="admin-dashboard-categories-card"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-indigo-500/50 hover:shadow-md transition-all group block"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Категории
                </h3>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                  Перейти →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Дерево категорий, создание и скрытие
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm space-y-3 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Категории</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Доступно только главному администратору
              </p>
            </div>
          </div>
        )}

        {/* Brands */}
        {isAdmin ? (
          <Link
            href="/admin/brands"
            id="admin-dashboard-brands-card"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-amber-500/50 hover:shadow-md transition-all group block"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Бренды
                </h3>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                  Перейти →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Справочник производителей и логотипы
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm space-y-3 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Бренды</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Доступно только главному администратору
              </p>
            </div>
          </div>
        )}

        {/* Delivery & Payment */}
        {isAdmin ? (
          <Link
            href="/admin/delivery"
            id="admin-dashboard-delivery-card"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-cyan-500/50 hover:shadow-md transition-all group block"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Доставка и оплата
                </h3>
                <span className="text-[10px] bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 font-semibold px-2 py-0.5 rounded-full">
                  Перейти →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Тарифы, включение способов доставки и оплаты
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm space-y-3 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Доставка</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Доступно только главному администратору
              </p>
            </div>
          </div>
        )}

        {/* Promo Codes */}
        {isAdmin ? (
          <Link
            href="/admin/promocodes"
            id="admin-dashboard-promocodes-card"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-pink-500/50 hover:shadow-md transition-all group block"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                  Промокоды
                </h3>
                <span className="text-[10px] bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 font-semibold px-2 py-0.5 rounded-full">
                  Перейти →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Скидки, лимиты использований и сроки действия
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm space-y-3 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Промокоды</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Доступно только главному администратору
              </p>
            </div>
          </div>
        )}

        {/* Users */}
        {isAdmin ? (
          <Link
            href="/admin/users"
            id="admin-dashboard-users-card"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-rose-500/50 hover:shadow-md transition-all group block"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Пользователи
                </h3>
                <span className="text-[10px] bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-full">
                  Перейти →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Роли, блокировки и категории менеджеров
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm space-y-3 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Пользователи</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Доступно только главному администратору
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
