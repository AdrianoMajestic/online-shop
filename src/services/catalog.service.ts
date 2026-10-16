import mongoose, { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Category, ICategory } from "@/models/Category";
import { Product, IProduct } from "@/models/Product";
import { Brand, IBrand } from "@/models/Brand";
import { NotFoundError } from "@/lib/errors";
import { GetProductsQuery } from "@/lib/validations/catalog";

export interface CategoryTreeNode {
  _id: string;
  title: string;
  slug: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
  parentId: string | null;
  children: CategoryTreeNode[];
}

export interface PaginatedProductsResult {
  items: IProduct[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Builds a hierarchical tree of visible categories
 */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  await connectToDatabase();
  const categories = await Category.find({ isVisible: true })
    .sort({ sortOrder: 1, _id: 1 })
    .lean<ICategory[]>();

  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Initialize nodes
  for (const cat of categories) {
    const id = cat._id.toString();
    map.set(id, {
      _id: id,
      title: cat.title,
      slug: cat.slug,
      description: cat.description,
      isVisible: cat.isVisible,
      sortOrder: cat.sortOrder,
      parentId: cat.parentId ? cat.parentId.toString() : null,
      children: [],
    });
  }

  // Link children to parents
  for (const cat of categories) {
    const id = cat._id.toString();
    const node = map.get(id);
    if (!node) continue;

    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Collects IDs of a category and all its subcategories (recursively)
 */
export async function getCategoryAndDescendantIds(slug: string): Promise<mongoose.Types.ObjectId[]> {
  await connectToDatabase();
  const targetCategory = await Category.findOne({ slug, isVisible: true }).lean<ICategory>();
  if (!targetCategory) {
    return [];
  }

  const allCategories = await Category.find({ isVisible: true }).lean<ICategory[]>();
  const resultIds: mongoose.Types.ObjectId[] = [(targetCategory._id as mongoose.Types.ObjectId)];

  // Recursive or BFS traversal to find all descendants
  const queue: string[] = [targetCategory._id.toString()];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const cat of allCategories) {
      if (cat.parentId && cat.parentId.toString() === currentId) {
        resultIds.push(cat._id as mongoose.Types.ObjectId);
        queue.push(cat._id.toString());
      }
    }
  }

  return resultIds;
}

/**
 * Escapes special regex characters in SKU string
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Queries published and non-deleted products with filtering, search, sorting and pagination
 */
export async function getProducts(query: Partial<GetProductsQuery> = {}): Promise<PaginatedProductsResult> {
  await connectToDatabase();
  const page = query.page && query.page >= 1 ? query.page : 1;
  const limit = query.limit && query.limit >= 1 ? query.limit : 20;

  const filter: FilterQuery<IProduct> = {
    isPublished: true,
    deletedAt: null,
  };

  // 1. Text and SKU search
  if (query.q) {
    const trimmedQ = query.q.trim();
    const escapedQ = escapeRegex(trimmedQ);
    // Prefix regex for SKU (e.g. KB-APL -> matches KB-APL-IP15P-128)
    const skuRegex = new RegExp(`^${escapedQ}`, "i");

    filter.$or = [
      { sku: skuRegex },
      { $text: { $search: trimmedQ } },
    ];
  }

  // 2. Category filtering (including all descendants)
  if (query.category) {
    const categoryIds = await getCategoryAndDescendantIds(query.category);
    if (categoryIds.length === 0) {
      // Specified category doesn't exist or is not visible, return empty list
      return {
        items: [],
        page,
        limit,
        total: 0,
      };
    }
    filter.categoryId = { $in: categoryIds };
  }

  // 3. Brand filtering (multiselect by brand slugs)
  if (query.brand && query.brand.length > 0) {
    const brands = await Brand.find({ slug: { $in: query.brand } }).select("_id").lean();
    const brandIds = brands.map((b) => b._id);
    if (brandIds.length === 0) {
      return {
        items: [],
        page,
        limit,
        total: 0,
      };
    }
    filter.brandId = { $in: brandIds };
  }

  // 4. Price range filtering
  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    const priceCondition: Record<string, number> = {};
    if (query.priceMin !== undefined) {
      priceCondition.$gte = query.priceMin;
    }
    if (query.priceMax !== undefined) {
      priceCondition.$lte = query.priceMax;
    }
    filter.price = priceCondition;
  }

  // 5. Sorting
  let sortOption: Record<string, 1 | -1> = { salesCount: -1, _id: -1 };
  switch (query.sort) {
    case "price_asc":
      sortOption = { price: 1, _id: 1 };
      break;
    case "price_desc":
      sortOption = { price: -1, _id: -1 };
      break;
    case "new":
      sortOption = { createdAt: -1, _id: -1 };
      break;
    case "rating":
      sortOption = { ratingAvg: -1, reviewsCount: -1, _id: -1 };
      break;
    case "popular":
    default:
      sortOption = { salesCount: -1, _id: -1 };
      break;
  }

  // 6. Pagination
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("categoryId", "title slug")
      .populate("brandId", "title slug logoUrl")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean<IProduct[]>(),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
  };
}

/**
 * Returns detailed product by slug
 */
export async function getProductBySlug(slug: string): Promise<IProduct> {
  await connectToDatabase();
  const product = await Product.findOne({
    slug: slug.toLowerCase(),
    isPublished: true,
    deletedAt: null,
  })
    .populate("categoryId", "title slug")
    .populate("brandId", "title slug logoUrl description")
    .lean<IProduct>();

  if (!product) {
    throw new NotFoundError(`Товар с slug "${slug}" не найден`);
  }

  return product;
}

/**
 * Returns all available brands sorted alphabetically
 */
export async function getAllBrands(): Promise<IBrand[]> {
  await connectToDatabase();
  return Brand.find().sort({ title: 1, _id: 1 }).lean<IBrand[]>();
}
