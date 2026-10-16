"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
}

export function Pagination({ page, limit, total }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) {
    return null;
  }

  const navigateToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: true });
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-6">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Показано <strong className="text-foreground">{startItem}–{endItem}</strong> из{" "}
        <strong className="text-foreground">{total}</strong> товаров
      </p>

      <nav aria-label="Пагинация каталога" className="order-1 sm:order-2 flex items-center gap-1.5">
        {/* Previous */}
        <button
          type="button"
          onClick={() => navigateToPage(page - 1)}
          disabled={page <= 1}
          aria-label="Предыдущая страница"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-9 w-7 items-center justify-center text-xs text-muted-foreground"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <button
                key={p}
                type="button"
                onClick={() => navigateToPage(p)}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => navigateToPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Следующая страница"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
