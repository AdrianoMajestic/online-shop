"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RotateCcw,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface MockPaymentClientProps {
  payment: {
    id: string;
    externalPaymentId: string;
    amount: number; // in kopecks
    status: string; // "pending" | "succeeded" | "failed" | "refunded"
    method: string;
  };
  order: {
    id: string;
    number: string;
    status: string;
    contactName: string;
    email: string;
    itemCount: number;
  };
}

export default function MockPaymentClient({
  payment,
  order,
}: MockPaymentClientProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(payment.status);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    });
  };

  const handleAction = async (status: "succeeded" | "failed") => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/payments/mock-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.externalPaymentId,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Ошибка обработки платежа");
      }

      setCurrentStatus(status);

      if (status === "succeeded") {
        setTimeout(() => {
          router.push(`/orders/${order.number}/success`);
        }, 1200);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Не удалось выполнить операцию"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/payments/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order.number }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message || "Не удалось создать новую попытку оплаты"
        );
      }

      if (data.confirmationUrl) {
        router.push(data.confirmationUrl);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Ошибка при создании повторной оплаты"
      );
      setIsRetrying(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Gateway header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
          <ShieldCheck className="h-4 w-4" />
          <span>Тестовый платежный шлюз (Эмуляция банка)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Оплата заказа {order.number}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Интернет-магазин «Кабачок» • {order.contactName} ({order.email})
        </p>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Order Amount Bar */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-100 font-medium">
              К оплате
            </p>
            <p className="text-3xl font-black mt-1 tracking-tight">
              {formatPrice(payment.amount)}
            </p>
            <p className="text-xs text-emerald-100/80 mt-1">
              Товаров: {order.itemCount} шт. • ID: {payment.externalPaymentId}
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <CreditCard className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ошибка</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Succeeded state */}
          {currentStatus === "succeeded" && (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 animate-scale" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Платеж успешно выполнен!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Заказ {order.number} переведен в статус «Оплачен».
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href={`/orders/${order.number}/success`}
                  className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all shadow-md shadow-emerald-600/20"
                >
                  <span>Перейти к просмотру заказа</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Failed state */}
          {currentStatus === "failed" && (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <XCircle className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Платеж отклонен
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Заказ сохранен со статусом «Новый». Средства не были списаны.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  id="mock-retry-payment-button"
                  onClick={handleRetryPayment}
                  disabled={isRetrying}
                  className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isRetrying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      <span>Повторить оплату</span>
                    </>
                  )}
                </button>
                <Link
                  href={`/orders/${order.number}/success`}
                  className="flex-1 h-12 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-all flex items-center justify-center"
                >
                  <span>К заказу</span>
                </Link>
              </div>
            </div>
          )}

          {/* Pending state: action buttons */}
          {currentStatus === "pending" && (
            <>
              {/* Card preview */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left font-mono text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Тестовая банковская карта</span>
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-white tracking-widest pt-1">
                  4242 •••• •••• 4242
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>СРОК: 12/28</span>
                  <span>CVC: 999</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20 text-left">
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Режим эмуляции эквайринга:
                </span>{" "}
                нажмите одну из кнопок ниже. Сервер сгенерирует криптографическую
                HMAC-SHA256 подпись и вызовет вебхук <code>POST /api/payments/webhook</code>.
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  id="mock-pay-success-button"
                  onClick={() => handleAction("succeeded")}
                  disabled={isProcessing}
                  className="w-full h-13 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Оплатить {formatPrice(payment.amount)} (Успех)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="mock-pay-fail-button"
                  onClick={() => handleAction("failed")}
                  disabled={isProcessing}
                  className="w-full h-11 py-2.5 px-6 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Отклонить платеж (Имитация отказа)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Безопасное соединение TLS 1.3</span>
          <Link
            href="/catalog"
            className="text-emerald-600 hover:underline font-medium"
          >
            Вернуться в магазин
          </Link>
        </div>
      </div>
    </div>
  );
}
