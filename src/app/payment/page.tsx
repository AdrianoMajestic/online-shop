import { Metadata } from "next";
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  Receipt,
  Lock,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Способы оплаты | Интернет-магазин «Кабачок»",
  description:
    "Условия и способы оплаты в интернет-магазине «Кабачок». Онлайн-оплата картой, оплата при получении, безопасность платежей и фискальные чеки.",
};

export default function PaymentPage() {
  const breadcrumbItems = [{ label: "Оплата" }];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-12 sm:space-y-16">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Способы и безопасность оплаты
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          В интернет-магазине «Кабачок» доступны удобные и проверенные способы оплаты. Все транзакции защищены банковскими протоколами шифрования.
        </p>
      </div>

      {/* Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 1: Online Cards */}
        <div className="flex flex-col p-6 sm:p-8 rounded-3xl border border-border/70 bg-card shadow-sm space-y-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Банковской картой онлайн</h2>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Мгновенное подтверждение и отсутствие комиссии
            </p>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground flex-1 leading-relaxed">
            Принимаются к оплате карты любых российских банков платежных систем МИР, Visa и Mastercard. Оплата происходит через защищенный платежный шлюз с протоколом 3D-Secure.
          </p>
          <div className="border-t border-border/60 pt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Шифрование данных по стандарту PCI DSS</span>
          </div>
        </div>

        {/* Method 2: COD */}
        <div className="flex flex-col p-6 sm:p-8 rounded-3xl border border-border/70 bg-card shadow-sm space-y-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Banknote className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">При получении заказа</h2>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Оплата после осмотра товара
            </p>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground flex-1 leading-relaxed">
            Вы можете оплатить заказ наличными или банковской картой курьеру при вручении, либо на кассе в выбранном пункте выдачи заказов (ПВЗ).
          </p>
          <div className="border-t border-border/60 pt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Курьер выдает кассовый и товарный чек</span>
          </div>
        </div>
      </div>

      {/* Fiscal receipt & 54-FZ */}
      <section className="rounded-3xl border border-border/70 bg-muted/30 p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              Электронные чеки и соблюдение 54-ФЗ
            </h2>
            <p className="text-xs text-muted-foreground">Официальный фискальный документооборот</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          В соответствии с Федеральным законом № 54-ФЗ «О применении контрольно-кассовой техники» после совершения онлайн-оплаты фискальный чек автоматически направляется на email-адрес, указанный при регистрации или оформлении заказа. Чек содержит QR-код для верификации в ФНС России.
        </p>
      </section>

      {/* Security guarantees */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span>Гарантии безопасности</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Защищенное соединение</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Все данные между вашим браузером и сервером передаются по протоколу TLS 1.3 с криптостойким шифрованием.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Безопасность карт</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Мы не сохраняем и не обрабатываем данные банковских карт на наших серверах. Транзакции проводятся сертифицированным эквайрингом.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Быстрый возврат средств</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              При отмене заказа или возврате товара денежные средства возвращаются на ту же карту, с которой была совершена оплата, в течение 1–3 рабочих дней.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
