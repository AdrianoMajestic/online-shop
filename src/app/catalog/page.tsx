import { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, Sparkles } from "lucide-react";
import { getCategoryTree, getAllBrands, getProducts } from "@/services/catalog.service";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { CatalogFilters } from "@/components/CatalogFilters";
import { Pagination } from "@/components/Pagination";
import { serializeProduct } from "@/lib/formatters";
import { getProductsQuerySchema, GetProductsQuery } from "@/lib/validations/catalog";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: {
    q?: string;
    category?: string;
    brand?: string | string[];
    priceMin?: string;
    priceMax?: string;
    sort?: string;
    page?: string;
    limit?: string;
  };
}

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  if (searchParams.q) {
    return {
      title: `Поиск «${searchParams.q}» | Каталог «Кабачок»`,
      description: `Результаты поиска по запросу «${searchParams.q}» в каталоге интернет-магазина «Кабачок».`,
    };
  }

  if (searchParams.category) {
    return {
      title: `Каталог: ${searchParams.category} | Интернет-магазин «Кабачок»`,
      description: `Купить товары категории ${searchParams.category} с гарантией и быстрой доставкой по России.`,
    };
  }

  return {
    title: "Каталог товаров | Интернет-магазин «Кабачок»",
    description: "Широкий ассортимент электроники, бытовой техники и умных гаджетов с быстрой доставкой и гарантией.",
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  // Normalize brand parameter to array
  let brandArray: string[] | undefined = undefined;
  if (searchParams.brand) {
    brandArray = Array.isArray(searchParams.brand)
      ? searchParams.brand
      : [searchParams.brand];
  }

  const parsedQuery = getProductsQuerySchema.safeParse({
    q: searchParams.q,
    category: searchParams.category,
    brand: brandArray,
    priceMin: searchParams.priceMin,
    priceMax: searchParams.priceMax,
    sort: searchParams.sort,
    page: searchParams.page,
    limit: searchParams.limit || 12,
  });

  const query: Partial<GetProductsQuery> = parsedQuery.success
    ? parsedQuery.data
    : { page: 1, limit: 12, sort: "popular", brand: [] };

  const [categories, brands, productsResult] = await Promise.all([
    getCategoryTree(),
    getAllBrands(),
    getProducts(query),
  ]);

  const serializedProducts = productsResult.items.map(serializeProduct);
  const serializedBrands = brands.map((b) => ({
    _id: b._id.toString(),
    title: b.title,
    slug: b.slug,
  }));

  // Resolve category title for breadcrumbs
  let currentCategoryTitle = "";
  if (query.category) {
    for (const root of categories) {
      if (root.slug === query.category) {
        currentCategoryTitle = root.title;
        break;
      }
      for (const child of root.children) {
        if (child.slug === query.category) {
          currentCategoryTitle = child.title;
          break;
        }
      }
      if (currentCategoryTitle) break;
    }
  }

  // Build breadcrumb items
  const breadcrumbItems = [
    { label: "Каталог", href: "/catalog" },
    ...(currentCategoryTitle ? [{ label: currentCategoryTitle }] : []),
    ...(query.q ? [{ label: `Поиск: ${query.q}` }] : []),
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Page Header */}
      <div className="mb-6 pb-4 border-b border-border/60">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {query.q
            ? `Поиск: «${query.q}»`
            : currentCategoryTitle || "Каталог товаров"}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {productsResult.total === 0
            ? "Товары не найдены"
            : `Найдено ${productsResult.total} ${getDeclension(productsResult.total)}`}
        </p>
      </div>

      {/* Main Catalog View with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Filter Controls (Client component that syncs with URL) */}
        <CatalogFilters
          categories={categories}
          brands={serializedBrands}
          currentCategory={query.category}
          currentBrands={query.brand || []}
          currentPriceMin={query.priceMin}
          currentPriceMax={query.priceMax}
          currentSort={query.sort}
          currentQ={query.q}
          totalProducts={productsResult.total}
        />

        {/* Product Grid & Pagination Area */}
        <main className="flex-1 w-full min-w-0">
          {productsResult.total === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-12 text-center bg-card/50 my-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                <PackageOpen className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Ничего не найдено</h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md">
                По вашему запросу не найдено ни одного товара. Попробуйте изменить параметры фильтров или поисковый запрос.
              </p>
              <Link
                href="/catalog"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span>Сбросить все фильтры</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {serializedProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                page={query.page || 1}
                limit={query.limit || 12}
                total={productsResult.total}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function getDeclension(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "товаров";
  if (mod10 === 1) return "товар";
  if (mod10 >= 2 && mod10 <= 4) return "товара";
  return "товаров";
}
