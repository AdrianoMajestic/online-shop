import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Layers, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.emerald.100),theme(colors.background))] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.emerald.950/30),theme(colors.background))] opacity-60" />

      <section className="container mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center lg:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          MVP «Кабачок» — Задача T00 выполнена
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
          Современный интернет-магазин{" "}
          <span className="text-emerald-600 dark:text-emerald-400">«Кабачок»</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Каркас проекта успешно инициализирован: Next.js 14 App Router, MongoDB, Tailwind CSS,
          shadcn/ui и строгая типизация TypeScript.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/api/health"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Проверить Health Check API
            <ArrowRight className="h-4 w-4" />
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors"
          >
            Документация docs/
          </a>
        </div>

        {/* Technical stack pills */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">Next.js 14 (App Router)</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Гибридный SSR/SSG, серверные компоненты и строгий TypeScript strict mode.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">MongoDB & Mongoose 8</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Кэшированный пул соединений в lib/db.ts, поддержка транзакций replica set.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">Tailwind & shadcn/ui</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Модульная дизайн-система с поддержкой светлой и тёмной темы и HSL-токенов.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">Качество и тесты</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              ESLint, Prettier, централизованный lib/errors.ts и быстрые unit-тесты Vitest.
            </p>
          </div>
        </div>

        {/* Status items */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Typecheck пройден</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Линтер настроен</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Vitest готов</span>
          </div>
        </div>
      </section>
    </div>
  );
}
