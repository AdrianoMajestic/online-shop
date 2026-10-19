"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/lib/cart-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";
  const { mergeGuestCartOnAuth } = useCart();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: callbackUrl,
      });

      if (res.error) {
        // Unified error message per security requirement
        setError("Неверный логин или пароль");
        setLoading(false);
        return;
      }

      await mergeGuestCartOnAuth();
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Неверный логин или пароль");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Кабачок
          </span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Вход в личный кабинет
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Введите email и пароль для доступа к заказам и профилю
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-3.5 text-sm text-rose-700 dark:text-rose-300 animate-in fade-in duration-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Электронная почта
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.ru"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Пароль
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Проверка данных...</span>
            </>
          ) : (
            <span>Войти</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <span>Нет учетной записи? </span>
        <Link
          href={`/register${callbackUrl !== "/account" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline"
        >
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md h-80 rounded-2xl bg-card border border-border animate-pulse" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
