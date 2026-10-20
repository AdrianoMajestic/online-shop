import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order, IOrder } from "@/models/Order";
import { Payment, IPayment } from "@/models/Payment";
import { ORDER_STATUS_VARIANTS, OrderStatus } from "@/lib/order-status";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  MapPin,
  User,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Заказ оформлен — Интернет-магазин «Кабачок»",
  description: "Информация о статусе и составе вашего заказа",
};

interface PageProps {
  params: {
    id: string; // Order number (e.g. KB-10001) or Mongo ObjectId
  };
}

export default async function OrderSuccessPage({ params }: PageProps) {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(params.id);
  const query = isObjectId
    ? { $or: [{ _id: params.id }, { number: params.id }] }
    : { number: params.id };

  const order = await Order.findOne(query).lean<IOrder>();

  if (!order) {
    notFound();
  }

  // Look up latest payment record for this order
  const payment = await Payment.findOne({ orderId: order._id })
    .sort({ createdAt: -1 })
    .lean<IPayment>();

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const statusVariant = ORDER_STATUS_VARIANTS[order.status as OrderStatus] || {
    label: order.status,
    badgeClass: "bg-muted text-foreground border-border",
  };

  const isPaid = order.status === "paid" || payment?.status === "succeeded";
  const isOnlinePending =
    order.paymentMethod === "card_online" &&
    !isPaid &&
    (!payment || payment.status === "pending");
  const isOnlineFailed =
    order.paymentMethod === "card_online" &&
    !isPaid &&
    payment?.status === "failed";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Hero Banner */}
        <div className="rounded-3xl border border-emerald-500/20 bg-card p-6 sm:p-10 shadow-xl shadow-emerald-500/5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 mb-3">
            <span>Заказ успешно принят</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Спасибо за покупку, {order.contact.fullName}!
          </h1>

          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Ваш заказ зарегистрирован в системе. Мы уже начали подготовку к сборке и доставке.
          </p>

          <div className="mt-5 inline-flex items-center gap-3 bg-muted/60 px-6 py-3 rounded-2xl border border-border">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Номер заказа:
            </span>
            <span
              id="order-success-number"
              className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-wide font-mono"
            >
              {order.number}
            </span>
          </div>

          {/* Status badge row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${statusVariant.badgeClass}`}
            >
              <span>Статус заказа:</span>
              <span className="font-bold">{statusVariant.label}</span>
            </div>

            {order.paymentMethod === "card_online" && (
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : isOnlineFailed
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Оплата:</span>
                <span className="font-bold">
                  {isPaid
                    ? "Оплачен онлайн"
                    : isOnlineFailed
                    ? "Платеж отклонен"
                    : "Ожидает оплаты"}
                </span>
              </div>
            )}

            {order.paymentMethod === "cod" && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                <Truck className="h-3.5 w-3.5" />
                <span>Оплата при получении курьеру</span>
              </div>
            )}
          </div>

          {/* Action Callout if payment is pending or failed */}
          {(isOnlinePending || isOnlineFailed) && payment && (
            <div className="mt-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {isOnlineFailed ? (
                  <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-foreground text-sm sm:text-base">
                    {isOnlineFailed
                      ? "Предыдущая попытка оплаты была отклонена"
                      : "Заказ ожидает оплаты картой онлайн"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Сумма к оплате: {formatPrice(order.finalAmount)}. Вы можете оплатить заказ прямо сейчас в тестовом шлюзе.
                  </p>
                </div>
              </div>

              <Link
                href={`/pay/mock/${payment.externalPaymentId}`}
                id="order-pay-now-button"
                className="w-full sm:w-auto shrink-0 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {isOnlineFailed ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Повторить оплату</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Оплатить заказ</span>
                  </>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Order Composition and Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Items list (2 columns) */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <span>Состав заказа</span>
              </h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {order.items.reduce((acc, it) => acc + it.quantity, 0)} шт.
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {order.items.map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="py-3.5 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      АРТ: {item.sku} • {item.quantity} шт. × {formatPrice(item.pricePerUnit)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">
                      {formatPrice(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery and Customer Info */}
            <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div className="bg-muted/40 p-3.5 rounded-2xl space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Доставка: {order.delivery.title}</span>
                </p>
                <p>
                  г. {order.shippingAddress.city}, ул. {order.shippingAddress.street}, д.{" "}
                  {order.shippingAddress.house}
                  {order.shippingAddress.apartment && `, кв./оф. ${order.shippingAddress.apartment}`}
                </p>
                <p>Индекс: {order.shippingAddress.postalCode}</p>
              </div>

              <div className="bg-muted/40 p-3.5 rounded-2xl space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Получатель</span>
                </p>
                <p>{order.contact.fullName}</p>
                <p>{order.contact.phone} • {order.contact.email}</p>
              </div>
            </div>
          </div>

          {/* Financial Totals Sidebar (1 column) */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
              Итог заказа
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Товары ({order.items.reduce((acc, it) => acc + it.quantity, 0)})</span>
                <span className="font-medium text-foreground">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Скидка {order.promo?.code ? `(${order.promo.code})` : ""}</span>
                  <span>−{formatPrice(order.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Доставка</span>
                <span className="font-medium text-foreground">
                  {order.deliveryCost > 0
                    ? formatPrice(order.deliveryCost)
                    : "Бесплатно"}
                </span>
              </div>

              <div className="border-t border-border pt-3 mt-3 flex justify-between items-baseline">
                <span className="text-sm font-bold text-foreground">Итого</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatPrice(order.finalAmount)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <Link
                href="/catalog"
                id="order-success-catalog-link"
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Продолжить покупки</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="w-full h-10 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium text-xs transition-all flex items-center justify-center"
              >
                На главную страницу
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
