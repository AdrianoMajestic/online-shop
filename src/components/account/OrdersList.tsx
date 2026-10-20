"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  RotateCcw,
  XCircle,
  Clock,
  MapPin,
  CreditCard,
  Banknote,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { ORDER_STATUS_VARIANTS, OrderStatus } from "@/lib/order-status";

interface OrderItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

interface OrderData {
  _id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: "card_online" | "cod";
  totalAmount: number;
  discountAmount: number;
  deliveryCost: number;
  finalAmount: number;
  items: OrderItem[];
  shippingAddress: {
    city: string;
    street: string;
    house: string;
    apartment?: string;
  };
  delivery: {
    title: string;
    price: number;
  };
}

interface OrdersListProps {
  initialOrders: OrderData[];
}

export function OrdersList({ initialOrders }: OrdersListProps) {
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [activeStatus, setActiveStatus] = useState<string>("all");

  // Repeat order state
  const [repeatingId, setRepeatingId] = useState<string | null>(null);
  const [repeatMessage, setRepeatMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  // Cancel order modal state
  const [cancelingOrder, setCancelingOrder] = useState<OrderData | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const filterTabs = [
    { id: "all", label: "Все заказы" },
    { id: "new", label: "Новые" },
    { id: "paid", label: "Оплаченные" },
    { id: "processing", label: "В обработке" },
    { id: "shipped", label: "Доставляются" },
    { id: "completed", label: "Завершенные" },
    { id: "cancelled", label: "Отмененные" },
  ];

  const filteredOrders =
    activeStatus === "all"
      ? orders
      : orders.filter((o) => o.status === activeStatus);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ₽";
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle Repeat Order
  const handleRepeatOrder = async (orderId: string) => {
    setRepeatingId(orderId);
    setRepeatMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/repeat`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось повторить заказ");
      }

      setRepeatMessage({
        text: data.message || "Товары успешно добавлены в корзину!",
        isError: false,
      });

      // Trigger cart event to update header badge
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err: unknown) {
      setRepeatMessage({
        text:
          err instanceof Error
            ? err.message
            : "Ошибка при повторении заказа",
        isError: true,
      });
    } finally {
      setRepeatingId(null);
    }
  };

  // Handle Cancel Order
  const handleConfirmCancel = async () => {
    if (!cancelingOrder) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/orders/${cancelingOrder._id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось отменить заказ");
      }

      // Update state locally
      setOrders((prev) =>
        prev.map((o) =>
          o._id === cancelingOrder._id ? { ...o, status: "cancelled" } : o
        )
      );
      setCancelingOrder(null);
    } catch (err: unknown) {
      setCancelError(
        err instanceof Error ? err.message : "Ошибка при отмене заказа"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 border-b border-border">
        {filterTabs.map((tab) => {
          const count =
            tab.id === "all"
              ? orders.length
              : orders.filter((o) => o.status === tab.id).length;

          const isActive = activeStatus === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive
                    ? "bg-background/20 text-background"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Repeat Order Notification Banner */}
      {repeatMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm border ${
            repeatMessage.isError
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {repeatMessage.isError ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            )}
            <span>{repeatMessage.text}</span>
          </div>
          {!repeatMessage.isError && (
            <Link
              href="/cart"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors ml-4"
            >
              Перейти в корзину →
            </Link>
          )}
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card/50 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Заказы не найдены
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {activeStatus === "all"
                ? "У вас пока нет оформленных заказов в интернет-магазине «Кабачок»."
                : "В выбранной категории заказов нет."}
            </p>
          </div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
          >
            <span>Начать покупки</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = ORDER_STATUS_VARIANTS[order.status] || {
              label: order.status,
              badgeClass: "bg-muted text-muted-foreground border-border",
            };

            const canCancel = order.status === "new";

            return (
              <div
                key={order._id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-emerald-500/40 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-base font-bold text-foreground">
                      {order.number}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                      {order.paymentMethod === "card_online" ? (
                        <>
                          <CreditCard className="h-3 w-3" />
                          <span>Картой онлайн</span>
                        </>
                      ) : (
                        <>
                          <Banknote className="h-3 w-3" />
                          <span>При получении</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                {/* Body: Items Preview & Address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {/* Items */}
                  <div className="md:col-span-2 space-y-2">
                    <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider block">
                      Состав заказа ({order.items.length}{" "}
                      {order.items.length === 1 ? "товар" : "товара"}):
                    </span>
                    <ul className="space-y-1.5">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg"
                        >
                          <span className="truncate max-w-[280px] sm:max-w-md font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="shrink-0 ml-2">
                            {item.quantity} шт. × {formatPrice(item.pricePerUnit)}
                          </span>
                        </li>
                      ))}
                      {order.items.length > 3 && (
                        <li className="text-xs text-muted-foreground italic pl-1">
                          и еще {order.items.length - 3} поз...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Delivery summary */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-xs space-y-1">
                    <span className="text-[11px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>Доставка: {order.delivery.title}</span>
                    </span>
                    <p className="text-muted-foreground truncate">
                      {order.shippingAddress.city}, {order.shippingAddress.street},{" "}
                      д. {order.shippingAddress.house}
                      {order.shippingAddress.apartment
                        ? `, кв. ${order.shippingAddress.apartment}`
                        : ""}
                    </p>
                    <div className="pt-2 flex items-baseline justify-between border-t border-border/40">
                      <span className="text-xs text-muted-foreground">Итого:</span>
                      <span className="text-base font-bold text-foreground">
                        {formatPrice(order.finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <div className="flex items-center gap-2">
                    {/* Repeat Order Button */}
                    <button
                      type="button"
                      onClick={() => handleRepeatOrder(order._id)}
                      disabled={repeatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
                      title="Добавить товары из заказа в корзину с проверкой наличия"
                    >
                      {repeatingId === order._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      <span>Повторить заказ</span>
                    </button>

                    {/* Cancel Order Button (Strictly only available in 'new' status) */}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelError(null);
                          setCancelingOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-colors"
                        title="Отмена заказа доступна только в статусе «Новый»"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Отменить</span>
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/account/orders/${order._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm shadow-emerald-600/20 ml-auto"
                  >
                    <span>Подробнее о заказе</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Order Cancellation */}
      {cancelingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-full bg-rose-500/10">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Отмена заказа
                </h3>
                <p className="text-xs text-muted-foreground">
                  Подтверждение действия
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              Вы уверены, что хотите отменить заказ{" "}
              <strong className="font-mono text-emerald-600">
                {cancelingOrder.number}
              </strong>
              ?
            </p>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-1">
              <p>• Зарезервированные остатки товаров будут возвращены на склад.</p>
              <p>• Примененные промокоды будут освобождены.</p>
              <p>• Действие отмены необратимо.</p>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelingOrder(null)}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-md shadow-rose-600/20"
              >
                {cancelLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>Подтвердить отмену</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
