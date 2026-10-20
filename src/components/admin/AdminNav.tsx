"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  User,
  ShieldAlert,
} from "lucide-react";

interface AdminNavProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
  assignedCategoryCount?: number;
}

export function AdminNav({
  userRole = "manager",
  userName,
  userEmail,
  assignedCategoryCount = 0,
}: AdminNavProps) {
  const pathname = usePathname();

  const isProductsActive = pathname.startsWith("/admin/products");
  const isOrdersActive = pathname.startsWith("/admin/orders");
  const isDashboardActive = pathname === "/admin";

  const roleLabel =
    userRole === "admin" ? "Главный администратор" : "Менеджер каталога";

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur mb-6 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and role badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-500/20">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-lg">
                Панель управления
              </span>
              <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {roleLabel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {userName || userEmail}
              {userRole === "manager" && (
                <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                  • Доступно категорий: {assignedCategoryCount}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/70 text-foreground transition-colors font-medium"
          >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Кабинет покупателя</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/70 text-foreground transition-colors font-medium"
          >
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            <span>В витрину</span>
          </Link>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/60 overflow-x-auto text-sm">
        <Link
          href="/admin"
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            isDashboardActive
              ? "bg-purple-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Сводка</span>
        </Link>

        <Link
          href="/admin/products"
          id="admin-nav-products-tab"
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            isProductsActive
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Товары</span>
        </Link>

        <Link
          href="/admin/orders"
          id="admin-nav-orders-tab"
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            isOrdersActive
              ? "bg-blue-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Заказы</span>
        </Link>
      </div>

      {/* Category RBAC alert for managers */}
      {userRole === "manager" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Режим менеджера: Вы можете просматривать и редактировать товары
            только в назначенных вам категориях. Доступ к чужим категориям
            строго блокируется сервером (HTTP 403).
          </span>
        </div>
      )}
    </div>
  );
}
