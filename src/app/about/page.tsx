import { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Heart,
  Truck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "О компании | Интернет-магазин «Кабачок»",
  description:
    "История, ценности и принципы интернет-магазина «Кабачок». Мы предлагаем лучшую электронику и бытовую технику с честной гарантией.",
};

export default function AboutPage() {
  const breadcrumbItems = [{ label: "О компании" }];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-12 sm:space-y-16">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-900 p-8 sm:p-14 text-white shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Наша история и миссия</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Интернет-магазин «Кабачок»: растим технологии для вашего уюта
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
            Мы основали «Кабачок» с простой и искренней целью — сделать покупку современной электроники и надежной бытовой техники максимально легкой, понятной и безопасной для каждого.
          </p>
        </div>
      </section>

      {/* Key Numbers / Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl border border-border/70 bg-card text-center space-y-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
            1 000+
          </span>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Товаров в каталоге</p>
        </div>
        <div className="p-6 rounded-2xl border border-border/70 bg-card text-center space-y-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
            99.4%
          </span>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Положительных отзывов</p>
        </div>
        <div className="p-6 rounded-2xl border border-border/70 bg-card text-center space-y-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
            24 часа
          </span>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Средний срок доставки</p>
        </div>
        <div className="p-6 rounded-2xl border border-border/70 bg-card text-center space-y-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
            12 мес.
          </span>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Официальная гарантия</p>
        </div>
      </section>

      {/* Values & Principles */}
      <section className="space-y-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Наши ключевые принципы
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            На чем строится доверие тысяч покупателей каждый день
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">Только оригиналы</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Мы сотрудничаем напрямую с официальными дистрибьюторами и брендами (Apple, Samsung, Bosch, Philips, Xiaomi). Каждое устройство имеет сертификат и гарантийный талон.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">Забота о сроках</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Собственный склад в Москве и партнерская сеть из тысяч пунктов выдачи по всей стране обеспечивают получение заказа точно в согласованное время.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">Человеческий сервис</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Никаких роботов-отписок. Наша служба заботы готова ответить на любой вопрос по товару, проконсультировать по характеристикам и помочь в случае возврата.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl border border-border/70 bg-muted/30 p-8 sm:p-12 text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Готовы выбрать что-то особенное?
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Загляните в наш каталог — мы регулярно обновляем ассортимент новинками и предлагаем выгодные скидки для постоянных клиентов.
        </p>
        <div className="pt-2">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            <span>В каталог товаров</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
