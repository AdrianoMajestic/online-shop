"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ShieldCheck } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { HeaderSearch } from "@/components/HeaderSearch";
import { useCart } from "@/lib/cart-context";

const navItems = [
  { label: "Каталог", href: "/catalog", matchPrefixes: ["/catalog", "/product/"] },
  { label: "Доставка", href: "/delivery", matchPrefixes: ["/delivery"] },
  { label: "Оплата", href: "/payment", matchPrefixes: ["/payment"] },
  { label: "О компании", href: "/about", matchPrefixes: ["/about"] },
  { label: "Контакты", href: "/contacts", matchPrefixes: ["/contacts"] },
];

export function Header() {
  const pathname = usePathname();
  const { totalQuantity } = useCart();

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
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-sm shrink-0">
          {navItems.map((item) => {
            const isActive = item.matchPrefixes.some(
              (prefix) => pathname === prefix || pathname.startsWith(prefix)
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 shadow-xs"
                    : "font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/50">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Безопасная оплата</span>
          </div>

          <HeaderSearch />

          <Link
            href="/cart"
            id="header-cart-button"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted/70 transition-colors"
            aria-label="Корзина"
          >
            <ShoppingBag className="h-4 w-4 text-foreground" />
            {totalQuantity > 0 && (
              <span
                id="header-cart-count"
                className="absolute -top-1.5 -right-1.5 flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-75 duration-150"
              >
                {totalQuantity > 99 ? "99+" : totalQuantity}
              </span>
            )}
          </Link>

          <UserNav />
        </div>
      </div>
    </header>
  );
}
