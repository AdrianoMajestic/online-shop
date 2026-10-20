"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  RotateCcw,
  XCircle,
  MapPin,
  CreditCard,
  Banknote,
  Clock,
  User,
  Phone,
  Mail,
  Truck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  History,
} from "lucide-react";
import { ORDER_STATUS_VARIANTS, ORDER_STATUS_LABELS, OrderStatus } from "@/lib/order-status";

interface OrderItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

interface StatusHistoryItem {
  from: string;
  to: string;
  at: string;
}

interface OrderDetailData {
  _id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: "card_online" | "cod";
  totalAmount: number;
  discountAmount: number;
  deliveryCost: number;
  finalAmount: number;
  customerComment?: string;
  contact: {
    fullName: string;
    phone: string;
    email: string;
  };
  shippingAddress: {
    city: string;
    street: string;
    house: string;
    apartment?: string;
    postalCode: string;
    comment?: string;
  };
  delivery: {
    title: string;
    price: number;
  };
  promo?: {
    code: string;
    discountAmount: number;
  } | null;
  items: OrderItem[];
  statusHistory: StatusHistoryItem[];
}

interface OrderDetailContentProps {
  initialOrder: OrderDetailData;
}

export function OrderDetailContent({ initialOrder }: OrderDetailContentProps) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailData>(initialOrder);

  // Repeat state
  const [repeating, setRepeating] = useState(false);
  const [repeatMessage, setRepeatMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ₽";
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusConfig = ORDER_STATUS_VARIANTS[order.status] || {
    label: order.status,
    badgeClass: "bg-muted text-muted-foreground border-border",
  };

  const canCancel = order.status === "new";

  // Handle Repeat Order
  const handleRepeatOrder = async () => {
    setRepeating(true);
    setRepeatMessage(null);

    try {
      const res = await fetch(`/api/orders/${order._id}/repeat`, {
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

      // Trigger cart event
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
      setRepeating(false);
    }
  };

  // Handle Cancel Order
  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/orders/${order._id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось отменить заказ");
      }

      setOrder(data.order);
      setShowCancelModal(false);
      router.refresh();
    } catch (err: unknown) {
      setCancelError(
        err instanceof Error ? err.message : "Ошибка при отмене заказа"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back button & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад ко всем заказам</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-foreground">
              {order.number}
            </h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Оформлен {formatDate(order.createdAt)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Repeat Order Button */}
          <button
            type="button"
            onClick={handleRepeatOrder}
            disabled={repeating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-60"
          >
            {repeating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span>Повторить заказ</span>
          </button>

          {/* Cancel Order Button (Strictly only in status 'new') */}
          {canCancel && (
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setShowCancelModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-colors"
            >
              <XCircle className="h-4 w-4" />
              <span>Отменить заказ</span>
            </button>
          )}
        </div>
      </div>

      {/* Repeat Banner */}
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
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors ml-4"
            >
              В корзину →
            </Link>
          )}
        </div>
      )}

      {/* Order Items Table Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Package className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-foreground">
            Состав заказа ({order.items.length}{" "}
            {order.items.length === 1 ? "товар" : "товара"})
          </h2>
        </div>

        <div className="divide-y divide-border">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
            >
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground leading-snug">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono uppercase bg-muted/60 px-1.5 py-0.5 rounded">
                    Артикул: {item.sku}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                <div className="text-xs text-muted-foreground">
                  {item.quantity} шт. × {formatPrice(item.pricePerUnit)}
                </div>
                <div className="text-sm font-bold text-foreground">
                  {formatPrice(item.totalPrice)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Info: Delivery/Contacts + Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery & Recipient Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Truck className="h-5 w-5 text-emerald-600" />
            <span>Параметры доставки и получатель</span>
          </h2>

          <div className="space-y-4 text-xs">
            {/* Recipient */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                Получатель
              </span>
              <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{order.contact.fullName}</span>
              </p>
              <div className="flex flex-wrap gap-4 text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{order.contact.phone}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>{order.contact.email}</span>
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                Адрес доставки
              </span>
              <p className="font-medium text-foreground text-sm flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  г. {order.shippingAddress.city}, ул. {order.shippingAddress.street},{" "}
                  д. {order.shippingAddress.house}
                  {order.shippingAddress.apartment
                    ? `, кв. ${order.shippingAddress.apartment}`
                    : ""}
                  {order.shippingAddress.postalCode
                    ? ` (индекс: ${order.shippingAddress.postalCode})`
                    : ""}
                </span>
              </p>
              {order.shippingAddress.comment && (
                <p className="text-muted-foreground italic pl-6 text-xs">
                  Примечание: «{order.shippingAddress.comment}»
                </p>
              )}
            </div>

            {/* Delivery method */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                  Способ доставки
                </span>
                <p className="font-medium text-foreground mt-0.5">
                  {order.delivery.title}
                </p>
              </div>
              <span className="font-bold text-foreground">
                {order.delivery.price === 0
                  ? "Бесплатно"
                  : formatPrice(order.delivery.price)}
              </span>
            </div>

            {order.customerComment && (
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 text-xs">
                <span className="font-semibold text-muted-foreground block mb-0.5">
                  Комментарий покупателя к заказу:
                </span>
                <p className="text-foreground">{order.customerComment}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Calculation Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <span>Оплата и расчет стоимости</span>
          </h2>

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                  Способ оплаты
                </span>
                <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  {order.paymentMethod === "card_online" ? (
                    <>
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Банковской картой онлайн</span>
                    </>
                  ) : (
                    <>
                      <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Оплата при получении (наличные или карта)</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="space-y-2 text-sm pt-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Сумма товаров:</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Скидка {order.promo?.code ? `(«${order.promo.code}»)` : ""}:</span>
                  </span>
                  <span>−{formatPrice(order.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Доставка:</span>
                <span>
                  {order.deliveryCost === 0
                    ? "Бесплатно"
                    : formatPrice(order.deliveryCost)}
                </span>
              </div>

              <div className="border-t border-border pt-3 mt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-foreground">
                  Итого к оплате:
                </span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatPrice(order.finalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status History Timeline Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
          <History className="h-5 w-5 text-emerald-600" />
          <span>История смены статусов заказа</span>
        </h2>

        {order.statusHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            История переходов отсутствует.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {order.statusHistory.map((h, idx) => {
              const label =
                ORDER_STATUS_LABELS[h.to as OrderStatus] || h.to;
              const isLast = idx === order.statusHistory.length - 1;

              return (
                <div key={idx} className="relative space-y-0.5">
                  <span
                    className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 bg-card ${
                      isLast
                        ? "border-emerald-600 ring-4 ring-emerald-500/20"
                        : "border-muted-foreground/40"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatDate(h.at)})
                    </span>
                  </div>
                  {h.from && (
                    <p className="text-xs text-muted-foreground">
                      Статус изменен с «{ORDER_STATUS_LABELS[h.from as OrderStatus] || h.from}» на «{label}»
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-full bg-rose-500/10">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Отмена заказа {order.number}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Подтверждение действия
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              Вы уверены, что хотите отменить этот заказ? Зарезервированные
              товары будут возвращены в каталог для других покупателей.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
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
