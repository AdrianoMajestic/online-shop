import Link from "next/link";
import { ShoppingBag, Heart, Shield, Truck, CreditCard } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/60 bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Features bar */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 pb-10 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Быстрая доставка</h4>
              <p className="text-xs text-muted-foreground">Курьером или в пункты выдачи</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Удобная оплата</h4>
              <p className="text-xs text-muted-foreground">Картой онлайн или при получении</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Гарантия качества</h4>
              <p className="text-xs text-muted-foreground">Контроль свежести и проверка товаров</p>
            </div>
          </div>
        </div>

        {/* Links matrix */}
        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <span className="font-bold text-foreground">Кабачок</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Интернет-магазин с широким ассортиментом товаров. Учебный MVP-проект на Next.js 14 и
              MongoDB.
            </p>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Каталог
            </h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/catalog" className="hover:text-emerald-600 transition-colors">
                  Все товары
                </Link>
              </li>
              <li>
                <Link href="/catalog?sort=popular" className="hover:text-emerald-600 transition-colors">
                  Хиты продаж
                </Link>
              </li>
              <li>
                <Link href="/catalog?sort=new" className="hover:text-emerald-600 transition-colors">
                  Новинки
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Покупателям
            </h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/delivery" className="hover:text-emerald-600 transition-colors">
                  Условия доставки
                </Link>
              </li>
              <li>
                <Link href="/payment" className="hover:text-emerald-600 transition-colors">
                  Способы оплаты
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-emerald-600 transition-colors">
                  Личный кабинет
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              О компании
            </h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-emerald-600 transition-colors">
                  О проекте
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-emerald-600 transition-colors">
                  Контакты
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Интернет-магазин «Кабачок». Все права защищены.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Сделано с любовью <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            </span>
            <span>•</span>
            <Link href="/api/health" className="hover:text-emerald-600 underline">
              Статус API
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
