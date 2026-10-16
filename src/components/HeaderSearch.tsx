"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export function HeaderSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Desktop Quick Search bar */}
      <form onSubmit={handleSubmit} className="hidden md:flex items-center relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию или SKU..."
          aria-label="Поиск товаров"
          className="h-9 w-48 lg:w-64 rounded-xl border border-border bg-muted/50 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all focus:w-72 focus:bg-background focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </form>

      {/* Mobile Search Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Поиск товаров"
        className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted/70 transition-colors"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Mobile Search Overlay */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-background p-3 shadow-xl md:hidden">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск товаров или SKU..."
              aria-label="Поиск товаров мобильный"
              className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-8 text-xs text-foreground focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
