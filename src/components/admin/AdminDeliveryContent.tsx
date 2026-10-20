"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CreditCard,
  Banknote,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  AdminDeliveryMethodItem,
  AdminPaymentMethodSetting,
} from "@/services/admin-directory.service";

interface DeliveryFormData {
  code: string;
  title: string;
  priceRubles: number;
  description: string;
  isActive: boolean;
}

const defaultFormData: DeliveryFormData = {
  code: "",
  title: "",
  priceRubles: 0,
  description: "",
  isActive: true,
};

export function AdminDeliveryContent() {
  const [methods, setMethods] = useState<AdminDeliveryMethodItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethodSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delivery Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<AdminDeliveryMethodItem | null>(null);
  const [formData, setFormData] = useState<DeliveryFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingMethod, setDeletingMethod] = useState<AdminDeliveryMethodItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accessible element IDs
  const codeInputId = useId();
  const titleInputId = useId();
  const priceInputId = useId();
  const descriptionInputId = useId();
  const isActiveCheckboxId = useId();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [delRes, payRes] = await Promise.all([
        fetch("/api/admin/delivery-methods"),
        fetch("/api/admin/payment-methods"),
      ]);

      if (!delRes.ok || !payRes.ok) {
        throw new Error("Не удалось загрузить параметры доставки и оплаты");
      }

      const delData = await delRes.json();
      const payData = await payRes.json();

      setMethods(delData.methods || []);
      setPaymentMethods(payData.methods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingMethod(null);
    setFormData(defaultFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: AdminDeliveryMethodItem) => {
    setEditingMethod(m);
    setFormData({
      code: m.code,
      title: m.title,
      priceRubles: m.price / 100,
      description: m.description,
      isActive: m.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const priceKopecks = Math.round(Number(formData.priceRubles) * 100);
      const payload = {
        code: formData.code.trim().toLowerCase(),
        title: formData.title.trim(),
        price: priceKopecks,
        description: formData.description,
        isActive: formData.isActive,
      };

      const url = editingMethod
        ? `/api/admin/delivery-methods/${editingMethod.id}`
        : "/api/admin/delivery-methods";
      const method = editingMethod ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка сохранения способа доставки");
      }

      setIsModalOpen(false);
      setSuccessMessage(
        editingMethod
          ? `Способ доставки "${formData.title}" обновлен`
          : `Способ доставки "${formData.title}" успешно создан`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDeliveryActive = async (m: AdminDeliveryMethodItem) => {
    try {
      const res = await fetch(`/api/admin/delivery-methods/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка изменения активности");
      }
      setMethods((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleTogglePaymentMethod = async (code: "card_online" | "cod", currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка изменения способа оплаты");
      }
      setPaymentMethods((prev) =>
        prev.map((p) => (p.code === code ? { ...p, isActive: !currentActive } : p))
      );
      setSuccessMessage(`Способ оплаты "${code === "card_online" ? "Картой онлайн" : "При получении"}" ${!currentActive ? "включен" : "отключен"}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMethod) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/delivery-methods/${deletingMethod.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось удалить способ доставки");
      }

      setDeletingMethod(null);
      setSuccessMessage(data.message || "Способ доставки удален");
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
      setDeletingMethod(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-cyan-600" />
            <span>Доставка и способы оплаты</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Управление тарифами доставки, включение и отключение способов расчетов (требования №50, 51)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="admin-add-delivery-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Новый способ доставки</span>
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

      {/* SECTION 1: PAYMENT METHODS (REQ 50) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-600" />
            <span>Способы оплаты (требование №50)</span>
          </h3>
          <span className="text-xs text-muted-foreground">Включение/отключение доступности в чекауте</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paymentMethods.map((pm) => (
            <div
              key={pm.code}
              className={`rounded-2xl border p-5 shadow-xs transition-colors flex items-center justify-between gap-4 ${
                pm.isActive
                  ? "border-purple-500/30 bg-card"
                  : "border-border bg-muted/20 opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${
                    pm.isActive
                      ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {pm.code === "card_online" ? (
                    <CreditCard className="h-5 w-5" />
                  ) : (
                    <Banknote className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-sm">{pm.title}</h4>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        pm.isActive
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {pm.isActive ? "Активен" : "Отключен"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{pm.description}</p>
                </div>
              </div>

              <button
                onClick={() => handleTogglePaymentMethod(pm.code, pm.isActive)}
                title={pm.isActive ? "Отключить способ оплаты" : "Включить способ оплаты"}
                className="text-foreground hover:scale-110 transition-transform shrink-0"
              >
                {pm.isActive ? (
                  <ToggleRight className="h-8 w-8 text-purple-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: DELIVERY METHODS (REQ 51) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-cyan-600" />
            <span>Способы доставки (требование №51)</span>
          </h3>
          <span className="text-xs text-muted-foreground">Тарифы и активность способов доставки</span>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
              <span className="text-sm">Загрузка способов доставки...</span>
            </div>
          ) : methods.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium">Способы доставки не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th className="py-3 px-4">Код</th>
                    <th className="py-3 px-4">Название</th>
                    <th className="py-3 px-4">Стоимость</th>
                    <th className="py-3 px-4">Описание</th>
                    <th className="py-3 px-4 text-center">Статус</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {methods.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground font-semibold">
                        {m.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {m.title}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-700 dark:text-cyan-400">
                        {m.price === 0 ? "Бесплатно" : `${(m.price / 100).toLocaleString("ru-RU")} ₽`}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {m.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleDeliveryActive(m)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            m.isActive
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {m.isActive ? "Активен" : "Отключен"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(m)}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                            title="Редактировать способ доставки"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingMethod(m)}
                            className="p-1.5 rounded-lg border border-border hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition-colors"
                            title="Удалить способ доставки"
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
      </div>

      {/* Delivery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-cyan-600" />
                <span>{editingMethod ? "Редактирование способа доставки" : "Новый способ доставки"}</span>
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
                    Код способа (code) *
                  </label>
                  <input
                    id={codeInputId}
                    type="text"
                    required
                    disabled={!!editingMethod}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="courier, pickup, cdek"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-mono text-xs disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor={priceInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Стоимость в рублях *
                  </label>
                  <input
                    id={priceInputId}
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.priceRubles}
                    onChange={(e) => setFormData({ ...formData, priceRubles: parseFloat(e.target.value) || 0 })}
                    placeholder="350"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={titleInputId} className="block text-xs font-semibold text-foreground mb-1">
                  Название способа доставки *
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Курьерская доставка до двери"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>

              <div>
                <label htmlFor={descriptionInputId} className="block text-xs font-semibold text-foreground mb-1">
                  Описание и сроки доставки
                </label>
                <textarea
                  id={descriptionInputId}
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Доставка на следующий день в интервале 10:00–18:00..."
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-xs"
                />
              </div>

              <div className="flex items-center">
                <label htmlFor={isActiveCheckboxId} className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    id={isActiveCheckboxId}
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-border text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                  />
                  <span>Способ активен (доступен покупателям при оформлении)</span>
                </label>
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
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingMethod ? "Сохранить изменения" : "Создать способ"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Удаление способа доставки</h3>
                <p className="text-xs text-muted-foreground">Это действие необратимо</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Вы уверены, что хотите удалить способ доставки{" "}
              <strong className="text-cyan-600">«{deletingMethod.title}»</strong> ({deletingMethod.code})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingMethod(null)}
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
                <span>Удалить способ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
