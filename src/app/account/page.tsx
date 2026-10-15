import { getSession } from "@/lib/rbac";
import { User, Mail, Phone, Shield, Calendar, CheckCircle, Package } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sessionData = await getSession();
  const user = sessionData?.user as {
    name?: string;
    email?: string;
    role?: string;
    phone?: string;
    createdAt?: Date | string;
    consents?: {
      personalData?: { given?: boolean; at?: string | Date };
      marketing?: { given?: boolean; at?: string | Date };
    };
  } | undefined;

  const role = user?.role || "customer";
  const roleLabel =
    role === "admin"
      ? "Администратор"
      : role === "manager"
        ? "Менеджер каталога"
        : "Покупатель";

  const isStaff = role === "admin" || role === "manager";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Личный кабинет
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление персональными данными, согласиями и заказами
          </p>
        </div>
        {isStaff && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shadow-md shadow-purple-600/20"
          >
            <Shield className="h-4 w-4" />
            <span>Панель управления ({roleLabel})</span>
          </Link>
        )}
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            <span>Учетные данные</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Имя
              </span>
              <p className="font-medium text-foreground mt-0.5">{user?.name || "—"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </span>
              <p className="font-medium text-foreground mt-0.5">{user?.email || "—"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>Телефон</span>
              </span>
              <p className="font-medium text-foreground mt-0.5">{user?.phone || "Не указан"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>Роль в системе</span>
              </span>
              <p className="font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                {roleLabel}
              </p>
            </div>
          </div>

          {/* Consents status (152-FZ) */}
          <div className="border-t border-border pt-4 space-y-2">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
              Статус согласий (152-ФЗ)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-lg">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Согласие на обработку ПДн активно</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border/60 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Рассылка: {user?.consents?.marketing?.given ? "Подписан" : "Отключена"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Быстрые действия</h2>

          <div className="space-y-2">
            <Link
              href="/catalog"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/70 transition-colors text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                <span>Перейти в каталог</span>
              </span>
              <span className="text-muted-foreground">→</span>
            </Link>
          </div>

          <div className="pt-4 text-xs text-muted-foreground leading-relaxed">
            Разделы истории заказов, сохраненных адресов и отзывов будут доступны в следующих задачах (T08).
          </div>
        </div>
      </div>
    </div>
  );
}
