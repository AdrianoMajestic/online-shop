"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Shield, UserCheck, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function UserNav() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="h-10 w-24 rounded-lg bg-muted/60 animate-pulse hidden sm:block" />
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted/80 transition-colors text-xs sm:text-sm font-medium text-foreground"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Войти</span>
        </Link>
        <Link
          href="/register"
          className="hidden sm:inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-xs sm:text-sm font-medium shadow-sm shadow-emerald-600/20"
        >
          Регистрация
        </Link>
      </div>
    );
  }

  const user = session.user as {
    name?: string;
    email?: string;
    role?: string;
  };

  const role = user.role || "customer";
  const roleLabel =
    role === "admin"
      ? "Администратор"
      : role === "manager"
        ? "Менеджер"
        : "Покупатель";

  const isStaff = role === "admin" || role === "manager";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted/70 transition-colors text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-expanded={isOpen}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <span className="max-w-[120px] truncate hidden md:inline text-xs sm:text-sm">
          {user.name || user.email}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-background/95 backdrop-blur shadow-xl py-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2 border-b border-border/70">
            <p className="font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-1.5 inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {roleLabel}
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-foreground hover:bg-muted/70 transition-colors"
            >
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>Личный кабинет</span>
            </Link>

            {isStaff && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-foreground hover:bg-muted/70 transition-colors"
              >
                <Shield className="h-4 w-4 text-purple-600" />
                <span>Панель управления</span>
              </Link>
            )}
          </div>

          <div className="border-t border-border/70 pt-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
