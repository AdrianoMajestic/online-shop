"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Percent,
  Coins,
} from "lucide-react";
import { AdminPromoCodeItem } from "@/services/admin-directory.service";

interface PromoFormData {
  code: string;
  discountType: "percentage" | "fixed";
  discountValueDisplay: number;
  minOrderAmountRubles: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  isActive: boolean;
}

const defaultFormData: PromoFormData = {
  code: "",
  discountType: "percentage",
  discountValueDisplay: 10,
  minOrderAmountRubles: 0,
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  usageLimit: 0,
  isActive: true,
};

export function AdminPromocodesContent() {
  const [promoCodes, setPromoCodes] = useState<AdminPromoCodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<AdminPromoCodeItem | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingPromo, setDeletingPromo] = useState<AdminPromoCodeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accessible element IDs
  const searchInputId = useId();
  const codeInputId = useId();
  const discountTypeSelectId = useId();
  const discountValueInputId = useId();
  const minOrderAmountInputId = useId();
  const validFromInputId = useId();
  const validToInputId = useId();
  const usageLimitInputId = useId();
  const isActiveCheckboxId = useId();

  const fetchPromoCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promocodes");
      if (!res.ok) {
        throw new Error("Не удалось загрузить промокоды");
      }
      const data = await res.json();
      setPromoCodes(data.promoCodes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormData(defaultFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: AdminPromoCodeItem) => {
    setEditingPromo(p);
    const valueDisplay =
      p.discountType === "percentage" ? p.discountValue : p.discountValue / 100;
    setFormData({
      code: p.code,
      discountType: p.discountType,
      discountValueDisplay: valueDisplay,
      minOrderAmountRubles: p.minOrderAmount / 100,
      validFrom: p.validFrom.slice(0, 10),
      validTo: p.validTo.slice(0, 10),
      usageLimit: p.usageLimit,
      isActive: p.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const discountValue =
        formData.discountType === "percentage"
          ? Number(formData.discountValueDisplay)
          : Math.round(Number(formData.discountValueDisplay) * 100);

      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue,
        minOrderAmount: Math.round(Number(formData.minOrderAmountRubles) * 100),
        validFrom: new Date(formData.validFrom).toISOString(),
        validTo: new Date(formData.validTo).toISOString(),
        usageLimit: Number(formData.usageLimit) || 0,
        isActive: formData.isActive,
      };

      const url = editingPromo
        ? `/api/admin/promocodes/${editingPromo.id}`
        : "/api/admin/promocodes";
      const method = editingPromo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка сохранения промокода");
      }

      setIsModalOpen(false);
      setSuccessMessage(
        editingPromo
          ? `Промокод "${formData.code}" обновлен`
          : `Промокод "${formData.code}" успешно создан`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchPromoCodes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p: AdminPromoCodeItem) => {
    try {
      const res = await fetch(`/api/admin/promocodes/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка изменения активности");
      }
      setPromoCodes((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPromo) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/promocodes/${deletingPromo.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось удалить промокод");
      }

      setDeletingPromo(null);
      setSuccessMessage(data.message || "Промокод удален");
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchPromoCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
      setDeletingPromo(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPromoCodes = promoCodes.filter((p) => {
    if (!searchQuery.trim()) return true;
    return p.code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5 text-pink-600" />
            <span>Управление промокодами</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Процентные и фиксированные скидки, пороги чеков, лимиты и даты действия (требование №52)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="admin-add-promocode-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Новый промокод</span>
        </button>
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

      {/* Search and counters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor={searchInputId} className="sr-only">
            Поиск промокода
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по коду промокода..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 uppercase"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Всего промокодов: {filteredPromoCodes.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
            <span className="text-sm">Загрузка промокодов...</span>
          </div>
        ) : filteredPromoCodes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium">Промокоды не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Код</th>
                  <th className="py-3 px-4">Тип скидки</th>
                  <th className="py-3 px-4">Размер скидки</th>
                  <th className="py-3 px-4">Мин. чек</th>
                  <th className="py-3 px-4">Период действия</th>
                  <th className="py-3 px-4 text-center">Использовано</th>
                  <th className="py-3 px-4 text-center">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPromoCodes.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-pink-600 dark:text-pink-400">
                      {p.code}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {p.discountType === "percentage" ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md font-medium">
                          <Percent className="h-3 w-3" />
                          <span>Процентная</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md font-medium">
                          <Coins className="h-3 w-3" />
                          <span>Фиксированная</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {p.discountType === "percentage"
                        ? `${p.discountValue}%`
                        : `${(p.discountValue / 100).toLocaleString("ru-RU")} ₽`}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {p.minOrderAmount === 0 ? "Без порога" : `от ${(p.minOrderAmount / 100).toLocaleString("ru-RU")} ₽`}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(p.validFrom).toLocaleDateString("ru-RU")} — {new Date(p.validTo).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      <span className="font-semibold text-foreground">{p.usedCount}</span>
                      <span className="text-muted-foreground">
                        {p.usageLimit > 0 ? ` / ${p.usageLimit}` : " (без лимита)"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          p.status === "active"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : p.status === "expired"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            : p.status === "limit_reached"
                            ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {p.status === "active"
                          ? "Активен"
                          : p.status === "expired"
                          ? "Истёк"
                          : p.status === "limit_reached"
                          ? "Лимит исчерпан"
                          : "Отключен"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                          title="Редактировать промокод"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingPromo(p)}
                          className="p-1.5 rounded-lg border border-border hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition-colors"
                          title="Удалить промокод"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Ticket className="h-5 w-5 text-pink-600" />
                <span>{editingPromo ? "Редактирование промокода" : "Новый промокод"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={codeInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Код промокода *
                  </label>
                  <input
                    id={codeInputId}
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2026, WELCOME"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30 uppercase font-mono text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={discountTypeSelectId} className="block text-xs font-semibold text-foreground mb-1">
                    Тип скидки *
                  </label>
                  <select
                    id={discountTypeSelectId}
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as "percentage" | "fixed",
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  >
                    <option value="percentage">Процент от заказа (%)</option>
                    <option value="fixed">Фиксированная сумма (₽)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={discountValueInputId} className="block text-xs font-semibold text-foreground mb-1">
                    {formData.discountType === "percentage" ? "Процент скидки (1–100%) *" : "Размер скидки в рублях *"}
                  </label>
                  <input
                    id={discountValueInputId}
                    type="number"
                    min="1"
                    max={formData.discountType === "percentage" ? 100 : undefined}
                    required
                    value={formData.discountValueDisplay}
                    onChange={(e) => setFormData({ ...formData, discountValueDisplay: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>

                <div>
                  <label htmlFor={minOrderAmountInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Минимальный чек (₽)
                  </label>
                  <input
                    id={minOrderAmountInputId}
                    type="number"
                    min="0"
                    value={formData.minOrderAmountRubles}
                    onChange={(e) => setFormData({ ...formData, minOrderAmountRubles: parseFloat(e.target.value) || 0 })}
                    placeholder="0 — без ограничений"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={validFromInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Дата начала действия *
                  </label>
                  <input
                    id={validFromInputId}
                    type="date"
                    required
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={validToInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Дата окончания действия *
                  </label>
                  <input
                    id={validToInputId}
                    type="date"
                    required
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label htmlFor={usageLimitInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Лимит использований
                  </label>
                  <input
                    id={usageLimitInputId}
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })}
                    placeholder="0 — без лимита"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">0 для неограниченного</span>
                </div>

                <div className="pt-2">
                  <label htmlFor={isActiveCheckboxId} className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      id={isActiveCheckboxId}
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-border text-pink-600 focus:ring-pink-500 h-4 w-4"
                    />
                    <span>Промокод активен</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingPromo ? "Сохранить изменения" : "Создать промокод"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Удаление промокода</h3>
                <p className="text-xs text-muted-foreground">Подтвердите действие</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Вы уверены, что хотите удалить промокод{" "}
              <strong className="text-pink-600">«{deletingPromo.code}»</strong>?
            </p>

            {deletingPromo.usedCount > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                Этот промокод уже был применен в {deletingPromo.usedCount} заказах. Для сохранения истории
                он будет деактивирован, а не удален физически.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingPromo(null)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Подтвердить удаление</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
