"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  Ban,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminUserItem } from "@/services/admin-directory.service";

interface AdminUsersContentProps {
  currentAdminId: string;
  currentAdminEmail?: string;
}

interface CategoryOption {
  id: string;
  title: string;
}

export function AdminUsersContent({
  currentAdminId,
  currentAdminEmail,
}: AdminUsersContentProps) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // All categories for manager assignment modal
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);

  // Role Modal state
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<"customer" | "manager" | "admin">("customer");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Ban Modal state
  const [banModalUser, setBanModalUser] = useState<AdminUserItem | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isTogglingBan, setIsTogglingBan] = useState(false);

  // Categories Modal state
  const [catModalUser, setCatModalUser] = useState<AdminUserItem | null>(null);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Accessible element IDs
  const searchInputId = useId();
  const roleFilterId = useId();
  const statusFilterId = useId();
  const newRoleSelectId = useId();
  const banReasonTextareaId = useId();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedRole !== "all") params.set("role", selectedRole);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Не удалось загрузить список пользователей");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedRole, selectedStatus, page, limit]);

  // Load categories once for manager assignment
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/admin/categories?view=admin");
        if (res.ok) {
          const data = await res.json();
          setAllCategories(
            (data.categories || []).map((c: { id: string; title: string }) => ({
              id: c.id,
              title: c.title,
            }))
          );
        }
      } catch {
        // Non-critical
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Role Change
  const openRoleModal = (u: AdminUserItem) => {
    setRoleModalUser(u);
    setNewRole(u.role);
    setError(null);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    setIsUpdatingRole(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${roleModalUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка обновления роли");
      }

      setRoleModalUser(null);
      setSuccessMessage(`Роль пользователя "${roleModalUser.name}" успешно изменена на "${newRole}"`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handle Ban / Unban
  const openBanModal = (u: AdminUserItem) => {
    setBanModalUser(u);
    setBanReason(u.banReason || "");
    setError(null);
  };

  const handleBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banModalUser) return;
    setIsTogglingBan(true);
    setError(null);

    const willBan = !banModalUser.banned;

    try {
      const res = await fetch(`/api/admin/users/${banModalUser.id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banned: willBan,
          banReason: willBan ? banReason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка изменения статуса блокировки");
      }

      setBanModalUser(null);
      setSuccessMessage(
        willBan
          ? `Пользователь "${banModalUser.name}" заблокирован`
          : `Пользователь "${banModalUser.name}" успешно разблокирован`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setIsTogglingBan(false);
    }
  };

  // Handle Category Assignment
  const openCatModal = (u: AdminUserItem) => {
    setCatModalUser(u);
    setSelectedCatIds(u.assignedCategoryIds || []);
    setError(null);
  };

  const toggleCategorySelection = (catId: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleCategoriesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catModalUser) return;
    setIsSavingCategories(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${catModalUser.id}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedCategoryIds: selectedCatIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка назначения категорий");
      }

      setCatModalUser(null);
      setSuccessMessage(`Назначено категорий менеджеру: ${selectedCatIds.length}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setIsSavingCategories(false);
    }
  };

  const isSelf = (u: AdminUserItem): boolean => {
    return Boolean(
      (currentAdminId && u.id === currentAdminId) ||
      (currentAdminEmail && u.email.toLowerCase() === currentAdminEmail.toLowerCase())
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-600" />
            <span>Управление пользователями</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Просмотр учетных записей, смена ролей, блокировка и назначение категорий менеджерам (требования №44, 45)
          </p>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters and search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <label htmlFor={searchInputId} className="sr-only">
            Поиск пользователя
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по имени, email, телефону..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <label htmlFor={roleFilterId} className="sr-only">
            Фильтр по роли
          </label>
          <select
            id={roleFilterId}
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          >
            <option value="all">Все роли</option>
            <option value="customer">Покупатели (customer)</option>
            <option value="manager">Менеджеры (manager)</option>
            <option value="admin">Администраторы (admin)</option>
          </select>
        </div>

        <div>
          <label htmlFor={statusFilterId} className="sr-only">
            Фильтр по статусу
          </label>
          <select
            id={statusFilterId}
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          >
            <option value="all">Любой статус</option>
            <option value="active">Только активные</option>
            <option value="banned">Только заблокированные</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
            <span className="text-sm">Загрузка пользователей...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium">Пользователи не найдены</p>
            <p className="text-xs mt-1">Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Пользователь</th>
                  <th className="py-3 px-4">Контакты</th>
                  <th className="py-3 px-4">Роль</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4">Категории менеджера</th>
                  <th className="py-3 px-4">Регистрация</th>
                  <th className="py-3 px-4 text-right">Управление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const selfUser = isSelf(u);

                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {selfUser && (
                                <span className="text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded-md">
                                  Вы
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                        {u.phone || "—"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === "admin"
                              ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                              : u.role === "manager"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {u.role === "admin" ? (
                            <Shield className="h-3 w-3" />
                          ) : u.role === "manager" ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          <span>
                            {u.role === "admin"
                              ? "Администратор"
                              : u.role === "manager"
                              ? "Менеджер"
                              : "Покупатель"}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.banned ? (
                          <span
                            title={u.banReason || "Заблокирован"}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                          >
                            <Ban className="h-3 w-3" />
                            <span>Заблокирован</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            <span>Активен</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {u.role === "manager" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {u.assignedCategoryIds.length} кат.
                            </span>
                            <button
                              onClick={() => openCatModal(u)}
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                              Настроить →
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ru-RU") : "—"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Button */}
                          <button
                            onClick={() => openRoleModal(u)}
                            disabled={selfUser}
                            title={
                              selfUser
                                ? "Вы не можете изменить свою собственную роль администратора"
                                : "Изменить роль пользователя"
                            }
                            className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Роль
                          </button>

                          {/* Ban / Unban Button */}
                          <button
                            onClick={() => openBanModal(u)}
                            disabled={selfUser}
                            title={
                              selfUser
                                ? "Вы не можете заблокировать самого себя"
                                : u.banned
                                ? "Разблокировать пользователя"
                                : "Заблокировать пользователя"
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                              u.banned
                                ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                                : "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {u.banned ? "Разбан" : "Бан"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-3 px-4 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total} пользователей
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold text-foreground">
                {page} из {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <span>Смена роли пользователя</span>
              </h3>
              <button
                onClick={() => setRoleModalUser(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-foreground">
              Пользователь: <strong>{roleModalUser.name}</strong> ({roleModalUser.email})
            </p>

            <form onSubmit={handleRoleSubmit} className="space-y-4 text-sm">
              <div>
                <label htmlFor={newRoleSelectId} className="block text-xs font-semibold text-foreground mb-1">
                  Выберите новую роль
                </label>
                <select
                  id={newRoleSelectId}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "customer" | "manager" | "admin")}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="customer">Покупатель (customer) — стандартный доступ</option>
                  <option value="manager">Менеджер (manager) — каталог назначенных категорий и заказы</option>
                  <option value="admin">Администратор (admin) — полный доступ ко всей системе</option>
                </select>
              </div>

              {newRole === "manager" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                  После назначения роли менеджера не забудьте настроить доступные категории товаров.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isUpdatingRole && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Сохранить роль</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban / Unban Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-600" />
                <span>
                  {banModalUser.banned ? "Разблокировка пользователя" : "Блокировка пользователя"}
                </span>
              </h3>
              <button
                onClick={() => setBanModalUser(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-foreground">
              Пользователь: <strong>{banModalUser.name}</strong> ({banModalUser.email})
            </p>

            <form onSubmit={handleBanSubmit} className="space-y-4 text-sm">
              {!banModalUser.banned ? (
                <div>
                  <label htmlFor={banReasonTextareaId} className="block text-xs font-semibold text-foreground mb-1">
                    Причина блокировки
                  </label>
                  <textarea
                    id={banReasonTextareaId}
                    rows={3}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Нарушение правил магазина, подозрительная активность..."
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    При блокировке все активные сессии пользователя будут немедленно аннулированы.
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                  Пользователь снова сможет входить в систему и оформлять заказы.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isTogglingBan}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-medium transition-colors shadow-sm disabled:opacity-50 ${
                    banModalUser.banned
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isTogglingBan && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{banModalUser.banned ? "Разблокировать" : "Заблокировать"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Assignment Modal */}
      {catModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-indigo-600" />
                <span>Назначение категорий менеджеру</span>
              </h3>
              <button
                onClick={() => setCatModalUser(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Менеджер: <strong>{catModalUser.name}</strong> ({catModalUser.email}).
              Менеджер сможет просматривать и редактировать товары только в отмеченных категориях (Category RBAC, A-09).
            </p>

            <form onSubmit={handleCategoriesSubmit} className="space-y-4 text-sm">
              <div className="border border-border rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 bg-background">
                {allCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Категории не найдены</p>
                ) : (
                  allCategories.map((c) => {
                    const checked = selectedCatIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                          checked
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategorySelection(c.id)}
                          className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span>{c.title}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Выбрано категорий: {selectedCatIds.length}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCatIds(allCategories.map((c) => c.id))}
                    className="text-indigo-600 hover:underline"
                  >
                    Выбрать все
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCatIds([])}
                    className="text-muted-foreground hover:underline"
                  >
                    Сбросить
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCatModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategories}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingCategories && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Сохранить категории</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
