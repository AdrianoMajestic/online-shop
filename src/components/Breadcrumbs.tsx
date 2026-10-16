import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Хлебные крошки" className="flex items-center text-xs text-muted-foreground py-3 overflow-x-auto whitespace-nowrap">
      <ol className="flex items-center gap-1.5">
        <li className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            title="Главная"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Главная</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors max-w-[200px] truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground max-w-[260px] truncate" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
