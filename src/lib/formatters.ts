export interface SerializedProduct {
  _id: string;
  sku: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
  isPublished?: boolean;
  images: { url: string; alt: string }[];
  attributes: { key: string; value: string }[];
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
  categoryId?: { _id: string; title: string; slug: string } | string;
  brandId?: { _id: string; title: string; slug: string } | string;
  createdAt?: string;
}

/**
 * Formats price in kopecks to Russian Ruble string (e.g. 119 990 ₽)
 */
export function formatPrice(priceInKopecks: number): string {
  if (typeof priceInKopecks !== "number" || isNaN(priceInKopecks)) {
    return "0 ₽";
  }
  const rubles = priceInKopecks / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: rubles % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rubles);
}

/**
 * Calculates discount percentage
 */
export function getDiscountPercentage(price: number, discountPrice: number | null): number | null {
  if (!discountPrice || discountPrice >= price || price <= 0) {
    return null;
  }
  return Math.round(((price - discountPrice) / price) * 100);
}

interface RawProductInput {
  _id?: unknown;
  sku?: string;
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  discountPrice?: number | null;
  stockQuantity?: number;
  isPublished?: boolean;
  images?: { url?: string; alt?: string }[];
  attributes?: { key?: string; value?: string }[];
  ratingAvg?: number;
  reviewsCount?: number;
  salesCount?: number;
  categoryId?: { _id?: unknown; title?: string; slug?: string } | unknown;
  brandId?: { _id?: unknown; title?: string; slug?: string } | unknown;
  createdAt?: string | Date;
}

/**
 * Serializes Mongoose product document for Next.js Client Components
 */
export function serializeProduct(product: RawProductInput): SerializedProduct {
  const catObj =
    product.categoryId && typeof product.categoryId === "object"
      ? (product.categoryId as { _id?: unknown; title?: string; slug?: string })
      : null;

  const brandObj =
    product.brandId && typeof product.brandId === "object"
      ? (product.brandId as { _id?: unknown; title?: string; slug?: string })
      : null;

  return {
    _id: product._id ? String(product._id) : "",
    sku: product.sku || "",
    title: product.title || "",
    slug: product.slug || "",
    description: product.description || "",
    price: product.price || 0,
    discountPrice: product.discountPrice ?? null,
    stockQuantity: product.stockQuantity ?? 0,
    isPublished: product.isPublished ?? true,
    images: (product.images || []).map((img) => ({
      url: img.url || "",
      alt: img.alt || "",
    })),
    attributes: (product.attributes || []).map((attr) => ({
      key: attr.key || "",
      value: attr.value || "",
    })),
    ratingAvg: product.ratingAvg ?? 5.0,
    reviewsCount: product.reviewsCount ?? 0,
    salesCount: product.salesCount ?? 0,
    categoryId: catObj
      ? {
          _id: catObj._id ? String(catObj._id) : "",
          title: catObj.title || "",
          slug: catObj.slug || "",
        }
      : product.categoryId
        ? String(product.categoryId)
        : undefined,
    brandId: brandObj
      ? {
          _id: brandObj._id ? String(brandObj._id) : "",
          title: brandObj.title || "",
          slug: brandObj.slug || "",
        }
      : product.brandId
        ? String(product.brandId)
        : undefined,
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
  };
}
