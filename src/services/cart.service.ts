import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Cart, ICart } from "@/models/Cart";
import { Product, IProduct } from "@/models/Product";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface EnrichedProductData {
  _id: string;
  sku: string;
  title: string;
  slug: string;
  price: number; // in kopecks
  discountPrice: number | null; // in kopecks
  effectivePrice: number; // in kopecks
  stockQuantity: number;
  images: { url: string; alt: string }[];
  isPublished: boolean;
  brandTitle?: string;
}

export interface EnrichedCartItem {
  productId: string;
  quantity: number;
  product: EnrichedProductData;
  itemTotal: number; // in kopecks
  isAvailable: boolean;
  exceedsStock: boolean;
}

export interface EnrichedCartResult {
  items: EnrichedCartItem[];
  totalQuantity: number;
  totalAmount: number; // in kopecks
}

interface RawCartItemInput {
  productId: string;
  quantity: number;
}

/**
 * Normalizes and aggregates raw items by productId
 */
function consolidateItems(rawItems: RawCartItemInput[]): RawCartItemInput[] {
  const map = new Map<string, number>();
  for (const item of rawItems) {
    const current = map.get(item.productId) || 0;
    map.set(item.productId, current + item.quantity);
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

/**
 * Builds enriched cart representation with fresh prices, stocks, and totals from DB
 */
export async function getEnrichedCart(
  userId: string
): Promise<EnrichedCartResult> {
  await connectToDatabase();

  const cart = await Cart.findOne({ userId }).lean<ICart>();
  if (!cart || !cart.items || cart.items.length === 0) {
    return { items: [], totalQuantity: 0, totalAmount: 0 };
  }

  const productIds = cart.items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
  })
    .populate("brandId", "title")
    .lean<(IProduct & { brandId?: { title?: string } })[]>();

  const productMap = new Map<string, IProduct & { brandId?: { title?: string } }>();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const enrichedItems: EnrichedCartItem[] = [];
  let totalQuantity = 0;
  let totalAmount = 0;

  for (const item of cart.items) {
    const pIdStr = item.productId.toString();
    const product = productMap.get(pIdStr);

    if (!product || !product.isPublished || product.deletedAt) {
      continue;
    }

    const effectivePrice = product.discountPrice ?? product.price;
    const isAvailable = product.stockQuantity > 0;
    const exceedsStock = item.quantity > product.stockQuantity;
    const clampedQty = Math.max(1, Math.min(item.quantity, product.stockQuantity));
    const itemTotal = clampedQty * effectivePrice;

    enrichedItems.push({
      productId: pIdStr,
      quantity: clampedQty,
      product: {
        _id: pIdStr,
        sku: product.sku,
        title: product.title,
        slug: product.slug,
        price: product.price,
        discountPrice: product.discountPrice ?? null,
        effectivePrice,
        stockQuantity: product.stockQuantity,
        images: product.images || [],
        isPublished: product.isPublished,
        brandTitle: product.brandId?.title,
      },
      itemTotal,
      isAvailable,
      exceedsStock,
    });

    if (isAvailable) {
      totalQuantity += clampedQty;
      totalAmount += itemTotal;
    }
  }

  return {
    items: enrichedItems,
    totalQuantity,
    totalAmount,
  };
}

/**
 * Enriches guest items from localStorage with fresh DB data without modifying DB
 */
export async function enrichGuestCart(
  rawItems: RawCartItemInput[]
): Promise<EnrichedCartResult> {
  await connectToDatabase();

  if (!rawItems || rawItems.length === 0) {
    return { items: [], totalQuantity: 0, totalAmount: 0 };
  }

  const consolidated = consolidateItems(rawItems);
  const validObjectIds = consolidated
    .filter((i) => mongoose.Types.ObjectId.isValid(i.productId))
    .map((i) => new mongoose.Types.ObjectId(i.productId));

  if (validObjectIds.length === 0) {
    return { items: [], totalQuantity: 0, totalAmount: 0 };
  }

  const products = await Product.find({
    _id: { $in: validObjectIds },
    isPublished: true,
    deletedAt: null,
  })
    .populate("brandId", "title")
    .lean<(IProduct & { brandId?: { title?: string } })[]>();

  const productMap = new Map<string, IProduct & { brandId?: { title?: string } }>();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const enrichedItems: EnrichedCartItem[] = [];
  let totalQuantity = 0;
  let totalAmount = 0;

  for (const item of consolidated) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const effectivePrice = product.discountPrice ?? product.price;
    const isAvailable = product.stockQuantity > 0;
    const exceedsStock = item.quantity > product.stockQuantity;
    const clampedQty = isAvailable
      ? Math.max(1, Math.min(item.quantity, product.stockQuantity))
      : item.quantity;
    const itemTotal = clampedQty * effectivePrice;

    enrichedItems.push({
      productId: item.productId,
      quantity: clampedQty,
      product: {
        _id: item.productId,
        sku: product.sku,
        title: product.title,
        slug: product.slug,
        price: product.price,
        discountPrice: product.discountPrice ?? null,
        effectivePrice,
        stockQuantity: product.stockQuantity,
        images: product.images || [],
        isPublished: product.isPublished,
        brandTitle: product.brandId?.title,
      },
      itemTotal,
      isAvailable,
      exceedsStock,
    });

    if (isAvailable) {
      totalQuantity += clampedQty;
      totalAmount += itemTotal;
    }
  }

  return {
    items: enrichedItems,
    totalQuantity,
    totalAmount,
  };
}

/**
 * Updates authenticated user's cart in DB with server-side stock validation
 */
export async function updateUserCart(
  userId: string,
  rawItems: RawCartItemInput[]
): Promise<EnrichedCartResult> {
  await connectToDatabase();

  const consolidated = consolidateItems(rawItems);

  if (consolidated.length === 0) {
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { upsert: true, new: true }
    );
    return { items: [], totalQuantity: 0, totalAmount: 0 };
  }

  // 1. Validate all product IDs and stock strictly on server
  const validObjectIds = consolidated.map((i) => {
    if (!mongoose.Types.ObjectId.isValid(i.productId)) {
      throw new NotFoundError(`Некорректный ID товара: ${i.productId}`);
    }
    return new mongoose.Types.ObjectId(i.productId);
  });

  const products = await Product.find({
    _id: { $in: validObjectIds },
    isPublished: true,
    deletedAt: null,
  }).lean<IProduct[]>();

  const productMap = new Map<string, IProduct>();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const itemsToSave: { productId: mongoose.Types.ObjectId; quantity: number }[] =
    [];

  for (const item of consolidated) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new NotFoundError(
        `Товар с ID ${item.productId} не найден или снят с продажи`
      );
    }

    if (item.quantity > product.stockQuantity) {
      throw new ConflictError(
        `Недостаточно товара «${product.title}» на складе. Доступно: ${product.stockQuantity} шт., запрошено: ${item.quantity} шт.`,
        "OUT_OF_STOCK",
        {
          productId: item.productId,
          availableStock: product.stockQuantity,
          requestedQuantity: item.quantity,
        }
      );
    }

    itemsToSave.push({
      productId: product._id as mongoose.Types.ObjectId,
      quantity: item.quantity,
    });
  }

  // 2. Persist to MongoDB
  await Cart.findOneAndUpdate(
    { userId },
    { $set: { items: itemsToSave } },
    { upsert: true, new: true }
  );

  return getEnrichedCart(userId);
}

/**
 * Merges guest cart items with authenticated user's DB cart.
 * Quantities are summed, but capped at physical stockQuantity.
 */
export async function mergeGuestCart(
  userId: string,
  guestItems: RawCartItemInput[]
): Promise<EnrichedCartResult> {
  await connectToDatabase();

  const consolidatedGuest = consolidateItems(guestItems);

  // 1. Fetch user's existing cart from DB
  const existingCart = await Cart.findOne({ userId }).lean<ICart>();
  const mergedMap = new Map<string, number>();

  if (existingCart && existingCart.items) {
    for (const item of existingCart.items) {
      const pId = item.productId.toString();
      mergedMap.set(pId, (mergedMap.get(pId) || 0) + item.quantity);
    }
  }

  // 2. Add guest items
  for (const item of consolidatedGuest) {
    if (!mongoose.Types.ObjectId.isValid(item.productId)) continue;
    const current = mergedMap.get(item.productId) || 0;
    mergedMap.set(item.productId, current + item.quantity);
  }

  if (mergedMap.size === 0) {
    return { items: [], totalQuantity: 0, totalAmount: 0 };
  }

  // 3. Fetch products and apply stock clamping
  const allProductIds = Array.from(mergedMap.keys()).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const products = await Product.find({
    _id: { $in: allProductIds },
    isPublished: true,
    deletedAt: null,
  }).lean<IProduct[]>();

  const finalItemsToSave: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
  }[] = [];

  for (const product of products) {
    const pIdStr = product._id.toString();
    const requestedSum = mergedMap.get(pIdStr) || 0;

    if (product.stockQuantity <= 0 || requestedSum <= 0) {
      continue;
    }

    // "количества суммируются, но итоговое количество не должно превышать доступный остаток товара stockQuantity"
    const clampedQuantity = Math.min(requestedSum, product.stockQuantity);

    finalItemsToSave.push({
      productId: product._id as mongoose.Types.ObjectId,
      quantity: clampedQuantity,
    });
  }

  // 4. Update Cart in DB
  await Cart.findOneAndUpdate(
    { userId },
    { $set: { items: finalItemsToSave } },
    { upsert: true, new: true }
  );

  return getEnrichedCart(userId);
}

/**
 * Clears authenticated user's cart in DB
 */
export async function clearUserCart(userId: string): Promise<EnrichedCartResult> {
  await connectToDatabase();
  await Cart.findOneAndUpdate(
    { userId },
    { $set: { items: [] } },
    { upsert: true, new: true }
  );
  return { items: [], totalQuantity: 0, totalAmount: 0 };
}
