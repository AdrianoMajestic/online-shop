import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Flame,
  Truck,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Smartphone,
  Laptop,
  Coffee,
  Home as HomeIcon,
  ShoppingBag,
} from "lucide-react";
import { getCategoryTree, getProducts } from "@/services/catalog.service";
import { ProductCard } from "@/components/ProductCard";
import { serializeProduct } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch popular categories, bestsellers, and new products in parallel
  const [categories, popularData, newData] = await Promise.all([
    getCategoryTree(),
    getProducts({ sort: "popular", limit: 8, page: 1 }),
    getProducts({ sort: "new", limit: 8, page: 1 }),
  ]);

  const bestsellers = popularData.items.map(serializeProduct);
  const newProducts = newData.items.map(serializeProduct);

  // Icon mapping for top categories
  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case "smartfony-i-gadzhety":
        return Smartphone;
      case "noutbuki-i-kompyutery":
        return Laptop;
      case "tekhnika-dlya-kukhni":
        return Coffee;
      case "tekhnika-dlya-doma":
        return HomeIcon;
      default:
        return ShoppingBag;
    }
  };

  return (
    <div className="flex flex-col gap-12 sm:gap-16 pb-16">
      {/* 1. HERO BANNER (баннер-заглушка) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950/20 via-background to-background pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-border/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-8 sm:p-12 lg:p-16 text-white shadow-2xl overflow-hidden">
            {/* Background geometric accents */}
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute right-1/4 -bottom-20 h-64 w-64 rounded-full bg-teal-400/20 blur-2xl" />

            <div className="relative z-10 max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-emerald-200 border border-white/15">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Сезон свежих скидок и технологий</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Всё для жизни, дома и работы в магазине{" "}
                <span className="text-emerald-300 underline decoration-emerald-400/50 underline-offset-8">
                  «Кабачок»
                </span>
              </h1>

              <p className="text-sm sm:text-lg text-emerald-100/90 leading-relaxed font-normal max-w-xl">
                Оригинальная электроника, надёжная бытовая техника и умные гаджеты. Быстрая доставка до двери и честная гарантия качества.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/catalog"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-950 shadow-lg hover:bg-emerald-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Перейти в каталог</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/catalog?sort=popular"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <Flame className="h-4 w-4 text-amber-300" />
                  <span>Хиты продаж</span>
                </Link>
              </div>

              {/* Promo promo-code pill */}
              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-200/80">
                <span>Промокод на первый заказ:</span>
                <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-white tracking-wider">
                  KABACHOK10
                </span>
                <span>(скидка 10%)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR CATEGORIES (Популярные категории) */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Популярные категории
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Удобная навигация по основным разделам каталога
            </p>
          </div>
          <Link
            href="/catalog"
            className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 transition-colors"
          >
            <span>Весь каталог</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.flatMap((cat) => (cat.children && cat.children.length > 0 ? cat.children : [cat])).map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            return (
              <Link
                key={cat._id}
                href={`/catalog?category=${cat.slug}`}
                className="group relative flex flex-col items-start p-5 rounded-2xl border border-border/70 bg-card hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors mb-3">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {cat.description || "Широкий выбор товаров с гарантией"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. BESTSELLERS (Хиты продаж по salesCount) */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Flame className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Хиты продаж
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Самые востребованные товары по количеству заказов
              </p>
            </div>
          </div>
          <Link
            href="/catalog?sort=popular"
            className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 transition-colors"
          >
            <span>Смотреть все</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {bestsellers.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. NEW ARRIVALS (Новинки) */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Новинки каталога
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Свежие поступления электроники и бытовой техники
              </p>
            </div>
          </div>
          <Link
            href="/catalog?sort=new"
            className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 transition-colors"
          >
            <span>Смотреть все</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {newProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. STORE ADVANTAGES / PERKS */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border/70 bg-muted/40 p-6 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Быстрая доставка</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Курьером до двери за 1–2 дня или бесплатный самовывоз
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Гарантия качества</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Только 100% оригинальная продукция с официальной гарантией
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Безопасная оплата</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Оплата картой онлайн с защитой 3D-Secure или при получении
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Простой возврат</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  14 дней на возврат товара надлежащего качества без лишних вопросов
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
