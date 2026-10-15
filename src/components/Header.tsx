import Link from "next/link";
import { ShoppingBag, Search, ShieldCheck } from "lucide-react";
import { UserNav } from "@/components/UserNav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Кабачок
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                MVP
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground -mt-1 hidden sm:inline-block">
              интернет-магазин
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link
            href="/catalog"
            className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Каталог
          </Link>
          <Link
            href="/delivery"
            className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Доставка
          </Link>
          <Link
            href="/payment"
            className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Оплата
          </Link>
          <Link
            href="/about"
            className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            О компании
          </Link>
          <Link
            href="/contacts"
            className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Контакты
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/50">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Безопасная оплата</span>
          </div>

          <Link
            href="/catalog"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted/70 transition-colors"
            aria-label="Поиск товаров"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted/70 transition-colors"
            aria-label="Корзина"
          >
            <ShoppingBag className="h-4 w-4 text-foreground" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
              0
            </span>
          </Link>

          <UserNav />
        </div>
      </div>
    </header>
  );
}
