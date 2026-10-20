"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  Loader2,
} from "lucide-react";

interface ConsentsContentProps {
  initialConsents: {
    personalData?: { given?: boolean; at?: string | Date };
    marketing?: { given?: boolean; at?: string | Date };
  };
}

export function ConsentsContent({ initialConsents }: ConsentsContentProps) {
  const [personalDataGiven, setPersonalDataGiven] = useState(
    initialConsents?.personalData?.given !== false
  );
  const [personalDataAt, setPersonalDataAt] = useState<string | Date | undefined>(
    initialConsents?.personalData?.at
  );

  const [marketingGiven, setMarketingGiven] = useState(
    initialConsents?.marketing?.given === true
  );
  const [marketingAt, setMarketingAt] = useState<string | Date | undefined>(
    initialConsents?.marketing?.at
  );

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  // Modal for revoking PDn consent
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const formatDate = (dateVal?: string | Date) => {
    if (!dateVal) return "Не зафиксировано";
    return new Date(dateVal).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // API caller
  const updateConsentApi = async (payload: {
    personalData?: boolean;
    marketing?: boolean;
  }) => {
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/consents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось сохранить согласие");
      }

      setFeedback({
        text: data.message || "Настройки успешно сохранены",
        isError: false,
      });

      if (payload.personalData !== undefined) {
        setPersonalDataGiven(payload.personalData);
        setPersonalDataAt(new Date());
      }

      if (payload.marketing !== undefined) {
        setMarketingGiven(payload.marketing);
        setMarketingAt(new Date());
      }
    } catch (err: unknown) {
      setFeedback({
        text:
          err instanceof Error
            ? err.message
            : "Ошибка при обновлении согласий",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for Personal Data toggle
  const handleTogglePersonalData = () => {
    if (personalDataGiven) {
      // Trying to revoke consent: show warning modal (Cannot be revoked quietly!)
      setShowRevokeModal(true);
    } else {
      // Re-granting consent
      updateConsentApi({ personalData: true });
    }
  };

  // Confirm revocation
  const handleConfirmRevoke = async () => {
    setShowRevokeModal(false);
    await updateConsentApi({ personalData: false });
  };

  // Handler for Marketing toggle
  const handleToggleMarketing = () => {
    updateConsentApi({ marketing: !marketingGiven });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Intro */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Управление согласиями и конфиденциальностью
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              В соответствии с Федеральным законом РФ № 152-ФЗ «О персональных
              данных»
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Интернет-магазин «Кабачок» строго соблюдает законодательство о защите
          персональных данных. Здесь вы можете в любой момент управлять своими
          согласиями на обработку данных и получение рекламных рассылок.
        </p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm border ${
            feedback.isError
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {feedback.isError ? (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Warning banner if Personal Data consent is revoked */}
      {!personalDataGiven && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <strong className="text-sm font-semibold block">
                Согласие на обработку персональных данных отозвано
              </strong>
              <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                Оформление новых заказов и сохранение адресов доставки
                заблокированы в соответствии с требованиями 152-ФЗ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateConsentApi({ personalData: true })}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-sm"
          >
            Возобновить согласие
          </button>
        </div>
      )}

      {/* Consents Cards */}
      <div className="space-y-4">
        {/* 1. 152-FZ Personal Data Consent */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <ShieldCheck
                  className={`h-5 w-5 ${
                    personalDataGiven ? "text-emerald-600" : "text-amber-500"
                  }`}
                />
                <h3 className="text-base font-semibold text-foreground">
                  Согласие на обработку персональных данных (152-ФЗ)
                </h3>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    personalDataGiven
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                  }`}
                >
                  {personalDataGiven ? "Активно" : "Отозвано"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Предоставляет согласие ООО «ТехноТорг» на обработку имени,
                телефона, адреса электронной почты и адреса доставки в целях
                регистрации, оформления и исполнения заказов, а также гарантийного
                обслуживания.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {personalDataGiven ? "Предоставлено: " : "Отозвано: "}
                  {formatDate(personalDataAt)}
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 self-end sm:self-center">
              <button
                type="button"
                role="switch"
                aria-checked={personalDataGiven}
                onClick={handleTogglePersonalData}
                disabled={loading}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  personalDataGiven ? "bg-emerald-600" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    personalDataGiven ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Marketing Emails Consent */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <Mail
                  className={`h-5 w-5 ${
                    marketingGiven ? "text-purple-600" : "text-muted-foreground"
                  }`}
                />
                <h3 className="text-base font-semibold text-foreground">
                  Маркетинговые рассылки и специальные предложения
                </h3>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    marketingGiven
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {marketingGiven ? "Подписан" : "Отключена"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Получение информации о скидках, персональных промокодах, закрытых
                распродажах и новинках каталога магазина «Кабачок» по электронной
                почте. Вы можете отказаться в любой момент без каких-либо
                ограничений.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {marketingGiven ? "Подключено: " : "Отключено: "}
                  {formatDate(marketingAt)}
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 self-end sm:self-center">
              <button
                type="button"
                role="switch"
                aria-checked={marketingGiven}
                onClick={handleToggleMarketing}
                disabled={loading}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  marketingGiven ? "bg-purple-600" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    marketingGiven ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal when attempting to revoke Personal Data consent */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Предупреждение об ограничении функций
                </h3>
                <p className="text-xs text-muted-foreground">
                  Отзыв согласия на обработку персональных данных (152-ФЗ)
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              Вы собираетесь отозвать согласие на обработку персональных данных.
              В соответствии с законодательством РФ и правилами магазина, это
              повлечет за собой следующие ограничения:
            </p>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>
                  <strong>Блокировка оформления новых заказов:</strong> мы не
                  сможем обрабатывать заказы без контактных данных покупателя.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>
                  <strong>Недоступность адресной книги:</strong> сохранение и
                  редактирование адресов доставки будет заблокировано.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>
                  <strong>Отключение персонализации:</strong> персональные
                  предложения и рекомендации будут отключены.
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Вы всегда сможете возобновить согласие в любой момент в личном
              кабинете.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
              >
                Отмена (сохранить согласие)
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-md shadow-rose-600/20"
              >
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>Отозвать согласие</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
