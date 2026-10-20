"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, ShieldCheck } from "lucide-react";

export function AccountNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/account",
      label: "Профиль и пароль",
      icon: User,
      exact: true,
    },
    {
      href: "/account/orders",
      label: "Мои заказы",
      icon: Package,
      exact: false,
    },
    {
      href: "/account/addresses",
      label: "Адреса доставки",
      icon: MapPin,
      exact: false,
    },
    {
      href: "/account/consents",
      label: "Согласия (152-ФЗ)",
      icon: ShieldCheck,
      exact: false,
    },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4 mb-8">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
