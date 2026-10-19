import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { getProductBySlug } from "@/services/catalog.service";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGallery } from "@/components/ProductGallery";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatPrice, getDiscountPercentage, serializeProduct } from "@/lib/formatters";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const product = await getProductBySlug(params.slug);
    const effectivePrice = formatPrice(product.discountPrice ?? product.price);
    const title = `${product.title} — купить по цене ${effectivePrice} | «Кабачок»`;
    const description =
      product.description?.slice(0, 160) ||
      `Купить ${product.title} (SKU: ${product.sku}) с быстрой доставкой и гарантией в интернет-магазине «Кабачок».`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    return {
      title: "Товар не найден | «Кабачок»",
      description: "Запрашиваемый товар не найден в каталоге интернет-магазина.",
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  let rawProduct;
  try {
    rawProduct = await getProductBySlug(params.slug);
  } catch {
    notFound();
  }

  const product = serializeProduct(rawProduct);
  const discountPercent = getDiscountPercentage(product.price, product.discountPrice);
  const effectivePrice = product.discountPrice ?? product.price;

  const category =
    typeof rawProduct.categoryId === "object" && rawProduct.categoryId !== null
      ? (rawProduct.categoryId as unknown as { title: string; slug: string })
      : null;

  const brand =
    typeof rawProduct.brandId === "object" && rawProduct.brandId !== null
      ? (rawProduct.brandId as unknown as { title: string; slug: string; logoUrl?: string; description?: string })
      : null;

  // Breadcrumbs
  const breadcrumbItems = [
    { label: "Каталог", href: "/catalog" },
    ...(category ? [{ label: category.title, href: `/catalog?category=${category.slug}` }] : []),
    { label: product.title },
  ];

  // Stock status text & style
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

  // Schema.org Product Microdata
  const schemaOrgProduct = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: product.images.map((img: { url: string; alt: string }) => img.url),
    description: product.description,
    sku: product.sku,
    mpn: product.sku,
    brand: brand
      ? {
          "@type": "Brand",
          name: brand.title,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      url: `https://kabachok.shop/product/${product.slug}`,
      priceCurrency: "RUB",
      price: ((product.discountPrice ?? product.price) / 100).toFixed(2),
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Кабачок",
      },
    },
    aggregateRating:
      product.reviewsCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.ratingAvg.toFixed(1),
            reviewCount: product.reviewsCount.toString(),
            bestRating: "5",
            worstRating: "1",
          }
        : undefined,
  };

  return (
    <>
      {/* Schema.org Product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgProduct) }}
      />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Product Layout: Gallery (Left) & Purchasing Info (Right) */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Gallery */}
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} title={product.title} />
          </div>

          {/* Right Column: Key Details & Purchasing */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Header: Brand & SKU */}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-b border-border/50 pb-3">
              {brand ? (
                <Link
                  href={`/catalog?brand=${brand.slug}`}
                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline uppercase tracking-wider"
                >
                  {brand.title}
                </Link>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1 font-mono text-xs">
                <span>Арт:</span>
                <span className="font-semibold text-foreground">{product.sku}</span>
              </div>
            </div>

            {/* Product Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
              {product.title}
            </h1>

            {/* Rating & Reviews Bar */}
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-4 w-4 fill-current" />
                <span>{product.ratingAvg.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground">
                {product.reviewsCount} отзывов покупателей
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground">
                Куплено {product.salesCount} раз
              </span>
            </div>

            {/* Price Box */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                  {formatPrice(effectivePrice)}
                </span>
                {product.discountPrice !== null && (
                  <span className="text-base sm:text-lg text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
                {discountPercent !== null && (
                  <span className="rounded-lg bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {/* Stock availability indicator */}
              <div className="flex items-center gap-2 text-xs font-medium pt-1">
                {isOutOfStock ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span className="text-muted-foreground">Нет в наличии на складе</span>
                  </>
                ) : isLowStock ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-700 dark:text-amber-400">
                      Осталось мало: в наличии {product.stockQuantity} шт.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-700 dark:text-emerald-400">
                      В наличии на складе ({product.stockQuantity} шт.)
                    </span>
                  </>
                )}
              </div>

              {/* Add to Cart Actions */}
              <div className="pt-2">
                <AddToCartButton
                  productId={product._id.toString()}
                  stockQuantity={product.stockQuantity}
                  productTitle={product.title}
                />
              </div>
            </div>

            {/* Service & Delivery perks */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3 text-xs">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong className="text-foreground">Быстрая доставка:</strong> курьером завтра или самовывоз сегодня
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong className="text-foreground">Официальная гарантия:</strong> 12 месяцев от производителя
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <RotateCcw className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong className="text-foreground">14 дней на возврат:</strong> без лишних вопросов
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections: Characteristics & Description */}
        <div className="mt-12 sm:mt-16 border-t border-border/70 pt-8 sm:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Description Block */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-xl font-bold text-foreground">Описание товара</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-4">
              <p>{product.description || "Описание товара готовится к публикации."}</p>
              <p>
                Покупая в интернет-магазине «Кабачок», вы получаете проверенную сертифицированную технику с полной технической документацией и гарантией сервисного обслуживания.
              </p>
            </div>
          </div>

          {/* Attributes / Characteristics Table */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-xl font-bold text-foreground">Характеристики</h2>
            {product.attributes && product.attributes.length > 0 ? (
              <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
                <dl className="divide-y divide-border/60 text-xs sm:text-sm">
                  {product.attributes.map((attr: { key: string; value: string }, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <dt className="text-muted-foreground">{attr.key}</dt>
                      <dd className="font-semibold text-foreground text-right">{attr.value}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-3 hover:bg-muted/40 transition-colors">
                    <dt className="text-muted-foreground">Артикул (SKU)</dt>
                    <dd className="font-mono font-semibold text-foreground text-right">{product.sku}</dd>
                  </div>
                  {brand && (
                    <div className="flex justify-between items-center px-4 py-3 hover:bg-muted/40 transition-colors">
                      <dt className="text-muted-foreground">Бренд</dt>
                      <dd className="font-semibold text-foreground text-right">{brand.title}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Основные характеристики уточняются у производителя.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
