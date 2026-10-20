import { requireAuth, getSession } from "@/lib/rbac";
import { ReactNode } from "react";
import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";
import { AccountNav } from "@/components/account/AccountNav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side session verification (Strict Server-Side Guard)
  await requireAuth({ redirectTo: "/account" });
  const sessionData = await getSession();
  const user = sessionData?.user as
    | {
        name?: string;
        email?: string;
        role?: string;
        phone?: string;
      }
    | undefined;

  const role = user?.role || "customer";
  const roleLabel =
    role === "admin"
      ? "Администратор"
      : role === "manager"
        ? "Менеджер каталога"
        : "Покупатель";

  const isStaff = role === "admin" || role === "manager";
  const initials = (user?.name || user?.email || "П")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-600/20 shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {user?.name || "Личный кабинет"}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.email} {user?.phone ? `• ${user.phone}` : ""}
            </p>
          </div>
        </div>

        {isStaff && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shadow-md shadow-purple-600/20 self-start sm:self-auto"
          >
            <Shield className="h-4 w-4" />
            <span>Панель управления</span>
          </Link>
        )}
      </div>

      {/* Navigation tabs */}
      <AccountNav />

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
