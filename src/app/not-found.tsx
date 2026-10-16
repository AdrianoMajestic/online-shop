import Link from "next/link";
import { Home, ShoppingBag, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Playful badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Ошибка 404</span>
        </div>

        {/* Big styled number */}
        <div className="relative">
          <span className="text-8xl sm:text-9xl font-black tracking-tighter text-emerald-600/20 dark:text-emerald-400/20 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Страница не найдена
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Кажется, эта страница затерялась на наших грядках или была перемещена. Проверьте правильность адреса или воспользуйтесь каталогом.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>На главную</span>
          </Link>

          <Link
            href="/catalog"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
            <span>В каталог товаров</span>
          </Link>
        </div>

        {/* Helpful links */}
        <div className="pt-6 border-t border-border/60 text-xs text-muted-foreground">
          <span>Популярные разделы: </span>
          <Link href="/catalog?category=smartfony-i-gadzhety" className="text-emerald-600 hover:underline">
            Смартфоны
          </Link>
          <span> • </span>
          <Link href="/catalog?category=noutbuki-i-kompyutery" className="text-emerald-600 hover:underline">
            Ноутбуки
          </Link>
          <span> • </span>
          <Link href="/catalog?sort=popular" className="text-emerald-600 hover:underline">
            Хиты продаж
          </Link>
        </div>
      </div>
    </div>
  );
}
