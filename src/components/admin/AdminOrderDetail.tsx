"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  User,
  MapPin,
  CreditCard,
  Package,
  MessageSquare,
  AlertTriangle,
  History,
  Send,
  X,
  ShieldCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import {
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  getAllowedNextStatuses,
} from "@/lib/order-status";

interface OrderDetailItem {
  _id: string;
  number: string;
  contact: {
    fullName: string;
    phone: string;
    email: string;
  };
  delivery: {
    title: string;
    price: number;
  };
  shippingAddress: {
    city: string;
    street: string;
    house: string;
    apartment?: string;
    postalCode: string;
    comment?: string;
  };
  items: {
    productId: string;
    sku: string;
    title: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }[];
  promo: {
    code: string;
    discountAmount: number;
  } | null;
  totalAmount: number;
  discountAmount: number;
  deliveryCost: number;
  finalAmount: number;
  status: OrderStatus;
  paymentMethod: "card_online" | "cod";
  customerComment?: string;
  managerComments: {
    authorId: string;
    authorName?: string;
    text: string;
    at: string;
  }[];
  statusHistory: {
    from: string;
    to: string;
    byUserId?: string;
    byUserName?: string;
    at: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface PaymentRecord {
  _id: string;
  provider: string;
  externalPaymentId: string;
  method: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amount: number;
  paidAt: string | null;
  createdAt: string;
}

interface AdminOrderDetailProps {
  orderIdOrNumber: string;
}

export function AdminOrderDetail({ orderIdOrNumber }: AdminOrderDetailProps) {
  const [order, setOrder] = useState<OrderDetailItem | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status mutation state
  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
  const [statusComment, setStatusComment] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New manager comment state
  const [newCommentText, setNewCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderIdOrNumber}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Не удалось загрузить данные заказа");
      }

      setOrder(data.order);
      setPayments(data.payments || []);
      setTargetStatus("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при загрузке заказа");
    } finally {
      setLoading(false);
    }
  }, [orderIdOrNumber]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Handle status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus || !order) return;

    setUpdatingStatus(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.number}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          comment: statusComment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Ошибка при смене статуса заказа");
      }

      setSuccessMessage(
        targetStatus === "cancelled"
          ? `Заказ ${order.number} отменен. Остатки товаров возвращены на склад.`
          : `Статус заказа ${order.number} успешно изменен на «${ORDER_STATUS_LABELS[targetStatus]}»`
      );

      setTargetStatus("");
      setStatusComment("");
      loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить статус");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle adding manager comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !order) return;

    setAddingComment(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.number}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newCommentText.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Ошибка при добавлении комментария");
      }

      setSuccessMessage("Внутренний комментарий успешно добавлен");
      setNewCommentText("");
      loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить комментарий");
    } finally {
      setAddingComment(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">Загрузка карточки заказа...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Заказ не найден</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Вернуться к списку заказов</span>
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const currentVariant = ORDER_STATUS_VARIANTS[order.status] || {
    label: order.status,
    badgeClass: "bg-muted text-foreground",
    bgClass: "bg-muted/20",
    textClass: "text-foreground",
  };

  const allowedNextStatuses = getAllowedNextStatuses(order.status);
  const totalItemsCount = order.items.reduce((acc, i) => acc + i.quantity, 0);

  const dateFormatted = new Date(order.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors shrink-0"
            title="Назад к реестру заказов"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {order.number}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentVariant.badgeClass}`}
              >
                {currentVariant.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Оформлен: {dateFormatted}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Ошибка операции</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 dark:border-emerald-900 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="font-medium flex-1">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status Transition Control Panel */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-foreground text-sm">
              Управление статусом заказа (A-05)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Текущий: <strong className="text-foreground">{currentVariant.label}</strong>
          </span>
        </div>

        {allowedNextStatuses.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground">
            Этот заказ находится в конечном статусе (<strong>{currentVariant.label}</strong>). Дальнейшие переходы статусов запрещены регламентом.
          </div>
        ) : (
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Выберите следующий разрешенный статус:
              </label>
              <div className="flex flex-wrap gap-2">
                {allowedNextStatuses.map((nextSt) => {
                  const isSelected = targetStatus === nextSt;
                  const isCancelled = nextSt === "cancelled";

                  return (
                    <button
                      key={nextSt}
                      type="button"
                      id={`status-choice-${nextSt}`}
                      onClick={() => setTargetStatus(nextSt)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? isCancelled
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20"
                            : "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>Перевести в «{ORDER_STATUS_LABELS[nextSt]}»</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {targetStatus === "cancelled" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div>
                  <p className="font-bold">Внимание: Автоматическая компенсация склада (A-06)</p>
                  <p className="mt-0.5 leading-relaxed">
                    При переводе заказа в статус «Отменен» все зарезервированные товары (<strong>{totalItemsCount} шт.</strong>) будут автоматически возвращены на склад (`stockQuantity`), а использованный промокод (если применялся) будет восстановлен.
                  </p>
                </div>
              </div>
            )}

            {targetStatus && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Комментарий к смене статуса (опционально):
                  </label>
                  <input
                    type="text"
                    id="admin-status-comment-input"
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="Например: Заказ передан в курьерскую службу..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus("");
                      setStatusComment("");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    id="admin-apply-status-button"
                    disabled={updatingStatus}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
                  >
                    {updatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Подтвердить смену статуса</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Main Grid: Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 cols): Items, Pricing, Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-foreground text-sm">
                  Состав заказа ({order.items.length} позиций, {totalItemsCount} шт.)
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th className="py-2.5 px-4">Товар / Артикул</th>
                    <th className="py-2.5 px-4 text-center">Кол-во</th>
                    <th className="py-2.5 px-4 text-right">Цена за ед.</th>
                    <th className="py-2.5 px-4 text-right">Итого</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {item.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        {item.quantity} шт.
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap text-muted-foreground">
                        {formatPrice(item.pricePerUnit)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-foreground">
                        {formatPrice(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="p-4 bg-muted/30 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Сумма товаров:</span>
                <span className="font-semibold text-foreground">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>
                    Скидка {order.promo ? `(промокод ${order.promo.code})` : ""}:
                  </span>
                  <span className="font-semibold">
                    -{formatPrice(order.discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Доставка ({order.delivery.title}):</span>
                <span className="font-semibold text-foreground">
                  {order.deliveryCost === 0
                    ? "Бесплатно"
                    : formatPrice(order.deliveryCost)}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
                <span>Итого к оплате:</span>
                <span className="text-base text-blue-600 dark:text-blue-400">
                  {formatPrice(order.finalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments Record */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-foreground text-sm">
                  Платежная информация
                </h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Способ: {order.paymentMethod === "card_online" ? "Онлайн картой" : "Оплата при получении"}
              </span>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {order.paymentMethod === "cod"
                  ? "Для способа «При получении» оплата производится курьеру или в пункте выдачи."
                  : "Транзакции по данному заказу отсутствуют."}
              </p>
            ) : (
              <div className="space-y-2.5">
                {payments.map((pmt) => {
                  const pmtDate = pmt.paidAt
                    ? new Date(pmt.paidAt).toLocaleString("ru-RU")
                    : new Date(pmt.createdAt).toLocaleString("ru-RU");

                  const isSuccess = pmt.status === "succeeded";

                  return (
                    <div
                      key={pmt._id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-background text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {formatPrice(pmt.amount)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : pmt.status === "failed"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {pmt.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          ID: {pmt.externalPaymentId} • Провайдер: {pmt.provider}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground text-right">
                        {pmtDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Customer, Delivery, Timeline, Manager Notes */}
        <div className="space-y-6">
          {/* Customer & Shipping Details */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4 text-xs">
            {/* Customer */}
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Покупатель</span>
              </div>
              <p className="font-medium text-foreground">{order.contact.fullName}</p>
              <p className="text-muted-foreground mt-0.5">{order.contact.email}</p>
              <p className="text-muted-foreground">{order.contact.phone}</p>
              {order.customerComment && (
                <div className="mt-2 p-2 rounded-lg bg-muted/40 border border-border/60">
                  <span className="font-semibold block text-[11px] text-muted-foreground">
                    Комментарий покупателя:
                  </span>
                  <p className="italic text-foreground mt-0.5">{order.customerComment}</p>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="pt-3 border-t border-border/60">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Адрес доставки</span>
              </div>
              <p className="font-medium text-foreground">
                г. {order.shippingAddress.city}, ул. {order.shippingAddress.street}, д. {order.shippingAddress.house}
                {order.shippingAddress.apartment && `, кв. ${order.shippingAddress.apartment}`}
              </p>
              <p className="text-muted-foreground mt-0.5">
                Индекс: {order.shippingAddress.postalCode}
              </p>
              {order.shippingAddress.comment && (
                <p className="text-muted-foreground mt-0.5 italic">
                  Примечание: {order.shippingAddress.comment}
                </p>
              )}
            </div>
          </div>

          {/* Status History Timeline */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm border-b border-border/60 pb-2.5">
              <History className="h-4 w-4 text-muted-foreground" />
              <span>История смены статусов</span>
            </div>

            {order.statusHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Заказ создан в статусе «{ORDER_STATUS_LABELS[order.status]}».
              </p>
            ) : (
              <div className="space-y-3 relative pl-4 border-l-2 border-border/80 text-xs">
                {order.statusHistory.map((hist, idx) => {
                  const histTime = new Date(hist.at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <div className="font-semibold text-foreground">
                        {ORDER_STATUS_LABELS[hist.from as OrderStatus] || hist.from} → {ORDER_STATUS_LABELS[hist.to as OrderStatus] || hist.to}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {histTime} • {hist.byUserName || "Сотрудник"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Internal Manager Comments */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm border-b border-border/60 pb-2.5">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <span>Заметки менеджера ({order.managerComments.length})</span>
            </div>

            {/* Comments List */}
            {order.managerComments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Внутренних комментариев пока нет.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {order.managerComments.map((c, idx) => {
                  const commentDate = new Date(c.at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-border bg-muted/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {c.authorName || "Сотрудник"}
                        </span>
                        <span>{commentDate}</span>
                      </div>
                      <p className="text-foreground leading-relaxed">{c.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-border/60 space-y-2">
              <textarea
                rows={2}
                required
                id="manager-comment-textarea"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Добавить внутреннюю заметку..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <button
                type="submit"
                id="add-manager-comment-btn"
                disabled={addingComment || !newCommentText.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {addingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Сохранить заметку</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
