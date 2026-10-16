import { Metadata } from "next";
import {
  Truck,
  MapPin,
  ShieldCheck,
  Package,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Условия доставки | Интернет-магазин «Кабачок»",
  description:
    "Информация о способах, стоимости и сроках доставки интернет-магазина «Кабачок». Курьерская доставка, пункты выдачи заказов и самовывоз.",
};

export default function DeliveryPage() {
  const breadcrumbItems = [{ label: "Доставка" }];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-12 sm:space-y-16">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Условия и способы доставки
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Мы стремимся доставить ваши покупки как можно быстрее и аккуратнее. Выберите наиболее удобный для вас вариант получения заказа.
        </p>
      </div>

      {/* Delivery Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Method 1: Courier */}
        <div className="flex flex-col p-6 sm:p-8 rounded-3xl border border-border/70 bg-card shadow-sm space-y-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Truck className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Курьерская доставка до двери</h2>
          <p className="text-xs sm:text-sm text-muted-foreground flex-1 leading-relaxed">
            Курьер свяжется за 1 час до прибытия. Возможность примерки и проверки техники на месте перед оплатой.
          </p>
          <div className="border-t border-border/60 pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Стоимость:</span>
              <span className="font-bold text-foreground">350 ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Срок:</span>
              <span className="font-semibold text-foreground">1–2 дня</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Бесплатно:</span>
              <span className="font-semibold text-emerald-600">от 5 000 ₽</span>
            </div>
          </div>
        </div>

        {/* Method 2: PVZ */}
        <div className="flex flex-col p-6 sm:p-8 rounded-3xl border border-border/70 bg-card shadow-sm space-y-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <MapPin className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Пункты выдачи (ПВЗ)</h2>
          <p className="text-xs sm:text-sm text-muted-foreground flex-1 leading-relaxed">
            Более 5 000 партнерских пунктов выдачи СДЭК и Boxberry по всей России. Удобно забрать по дороге домой или на работу.
          </p>
          <div className="border-t border-border/60 pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Стоимость:</span>
              <span className="font-bold text-foreground">190 ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Срок:</span>
              <span className="font-semibold text-foreground">2–4 дня</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Хранение:</span>
              <span className="font-semibold text-foreground">7 дней</span>
            </div>
          </div>
        </div>

        {/* Method 3: Pickup */}
        <div className="flex flex-col p-6 sm:p-8 rounded-3xl border border-border/70 bg-card shadow-sm space-y-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Самовывоз из магазина</h2>
          <p className="text-xs sm:text-sm text-muted-foreground flex-1 leading-relaxed">
            Бесплатный самовывоз из нашего центрального пункта выдачи. Заказ готов к выдаче уже через 2 часа после оформления.
          </p>
          <div className="border-t border-border/60 pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Стоимость:</span>
              <span className="font-bold text-emerald-600">Бесплатно</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Срок:</span>
              <span className="font-semibold text-foreground">Сегодня (от 2 ч.)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Хранение:</span>
              <span className="font-semibold text-foreground">5 дней</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection upon receipt */}
      <section className="rounded-3xl border border-border/70 bg-muted/30 p-6 sm:p-10 space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <span>Правила получения и проверки заказа</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              1. Проверка упаковки
            </h3>
            <p className="leading-relaxed">
              Убедитесь в целостности транспортного короба и заводской упаковки, отсутствии вмятин и следов вскрытия.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              2. Сверка комплектации
            </h3>
            <p className="leading-relaxed">
              Сверьте артикул, наименование модели и комплект поставки с товарным чеком или накладной.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              3. Подпись и оплата
            </h3>
            <p className="leading-relaxed">
              Распишитесь в получении и оплатите заказ, если выбран способ «Оплата при получении».
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-emerald-600" />
          <span>Часто задаваемые вопросы</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Можно ли изменить адрес доставки?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Да, адрес можно скорректировать до момента передачи заказа курьеру. Свяжитесь со службой поддержки или менеджером в личном кабинете.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Как отследить статус отправления?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              После отправки заказа в личном кабинете появится трек-номер. Статус также отображается на странице «Мои заказы».
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
