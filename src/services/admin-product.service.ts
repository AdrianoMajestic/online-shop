import mongoose, { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Product, IProduct } from "@/models/Product";
import { Category, ICategory } from "@/models/Category";
import { Brand, IBrand } from "@/models/Brand";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "@/lib/errors";
import { slugify } from "@/lib/slug";
import {
  AdminProductsQuery,
  AdminProductCreateInput,
  AdminProductUpdateInput,
} from "@/lib/validations/admin-product";
import { audit } from "@/services/audit";

export interface StaffUser {
  id?: string;
  role?: string;
  assignedCategoryIds?: string[];
  name?: string;
  email?: string;
}

export interface PaginatedAdminProductsResult {
  items: IProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Validates that the staff user has permission to manage products in the specified category.
 * - Admin has full access to all categories.
 * - Manager can only manage products whose categoryId is in their assignedCategoryIds.
 * - Otherwise throws ForbiddenError (HTTP 403).
 */
export function checkCategoryAccess(
  user: StaffUser,
  categoryId: string | mongoose.Types.ObjectId
): void {
  const role = user?.role || "customer";
  if (role === "admin") {
    return;
  }

  if (role === "manager") {
    const catIdStr = categoryId.toString();
    const assigned = user.assignedCategoryIds || [];
    if (!assigned.includes(catIdStr)) {
      throw new ForbiddenError(
        "Доступ запрещен: категория товара не назначена менеджеру"
      );
    }
    return;
  }

  throw new ForbiddenError("Недостаточно прав доступа");
}

/**
 * Returns a paginated list of products for the admin panel with role-based category restrictions.
 */
export async function getAdminProducts(
  user: StaffUser,
  query: AdminProductsQuery
): Promise<PaginatedAdminProductsResult> {
  await connectToDatabase();

  const role = user?.role || "customer";
  if (role !== "admin" && role !== "manager") {
    throw new ForbiddenError("Недостаточно прав для доступа к товарам");
  }

  const filter: FilterQuery<IProduct> = {
    deletedAt: null,
  };

  // 1. RBAC category filtering
  if (role === "manager") {
    const assigned = user.assignedCategoryIds || [];
    if (assigned.length === 0) {
      return {
        items: [],
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 0,
      };
    }

    if (query.categoryId) {
      // Manager explicitly selected a category: ensure it belongs to assigned list
      if (!assigned.includes(query.categoryId)) {
        throw new ForbiddenError(
          "Доступ запрещен: выбранная категория не назначена менеджеру"
        );
      }
      filter.categoryId = new mongoose.Types.ObjectId(query.categoryId);
    } else {
      // Default: show products across all assigned categories
      filter.categoryId = {
        $in: assigned.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }
  } else {
    // Admin: show selected category or all
    if (query.categoryId) {
      filter.categoryId = new mongoose.Types.ObjectId(query.categoryId);
    }
  }

  // 2. Brand filter
  if (query.brandId) {
    filter.brandId = new mongoose.Types.ObjectId(query.brandId);
  }

  // 3. Publication status filter
  if (query.isPublished === "true") {
    filter.isPublished = true;
  } else if (query.isPublished === "false") {
    filter.isPublished = false;
  }

  // 4. Search query (SKU or Title)
  if (query.q && query.q.trim().length > 0) {
    const term = query.q.trim();
    filter.$or = [
      { sku: { $regex: term, $options: "i" } },
      { title: { $regex: term, $options: "i" } },
    ];
  }

  const total = await Product.countDocuments(filter);
  const totalPages = Math.ceil(total / query.limit) || 1;
  const skip = (query.page - 1) * query.limit;

  const items = await Product.find(filter)
    .populate("categoryId", "title slug")
    .populate("brandId", "title slug logoUrl")
    .sort({ updatedAt: -1, _id: -1 })
    .skip(skip)
    .limit(query.limit)
    .exec();

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

/**
 * Retrieves a single product by ID for admin view/edit with RBAC category check.
 */
export async function getAdminProductById(
  productId: string,
  user: StaffUser
): Promise<IProduct> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new BadRequestError("Некорректный идентификатор товара");
  }

  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    deletedAt: null,
  })
    .populate("categoryId", "title slug")
    .populate("brandId", "title slug logoUrl")
    .exec();

  if (!product) {
    throw new NotFoundError("Товар не найден");
  }

  // Extract raw categoryId for RBAC check
  const rawCategoryId =
    product.categoryId &&
    typeof product.categoryId === "object" &&
    "_id" in product.categoryId
      ? (product.categoryId as { _id: mongoose.Types.ObjectId })._id
      : product.categoryId;

  checkCategoryAccess(user, rawCategoryId);

  return product;
}

/**
 * Creates a new product in the admin panel with category RBAC check and SKU/slug uniqueness.
 */
export async function createAdminProduct(
  data: AdminProductCreateInput,
  user: StaffUser
): Promise<IProduct> {
  await connectToDatabase();

  // 1. RBAC check on target category
  checkCategoryAccess(user, data.categoryId);

  // 2. Validate category and brand existence
  if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
    throw new BadRequestError("Некорректный идентификатор категории");
  }
  if (!mongoose.Types.ObjectId.isValid(data.brandId)) {
    throw new BadRequestError("Некорректный идентификатор бренда");
  }

  const categoryExists = await Category.findById(data.categoryId).lean();
  if (!categoryExists) {
    throw new NotFoundError("Указанная категория не существует");
  }

  const brandExists = await Brand.findById(data.brandId).lean();
  if (!brandExists) {
    throw new NotFoundError("Указанный бренд не существует");
  }

  // 3. Check SKU uniqueness
  const existingSku = await Product.findOne({
    sku: data.sku,
    deletedAt: null,
  }).lean();
  if (existingSku) {
    throw new ConflictError(`Товар с артикулом "${data.sku}" уже существует`);
  }

  // 4. Determine and check unique slug
  let slug = data.slug?.trim() || slugify(data.title);
  if (!slug) {
    slug = `prod-${Date.now()}`;
  }

  const existingSlug = await Product.findOne({ slug, deletedAt: null }).lean();
  if (existingSlug) {
    if (data.slug) {
      throw new ConflictError(
        `Товар с URL-идентификатором (slug) "${slug}" уже существует`
      );
    }
    // Auto-resolve duplicate slug when generated from title
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const newProduct = new Product({
    categoryId: new mongoose.Types.ObjectId(data.categoryId),
    brandId: new mongoose.Types.ObjectId(data.brandId),
    sku: data.sku,
    title: data.title,
    slug,
    description: data.description,
    price: data.price,
    discountPrice: data.discountPrice ?? null,
    stockQuantity: data.stockQuantity,
    isPublished: data.isPublished,
    images: data.images || [],
    attributes: data.attributes || [],
    ratingAvg: 5.0,
    reviewsCount: 0,
    salesCount: 0,
    deletedAt: null,
  });

  await newProduct.save();

  await newProduct.populate([
    { path: "categoryId", select: "title slug" },
    { path: "brandId", select: "title slug logoUrl" },
  ]);

  return newProduct;
}

/**
 * Updates an existing product with RBAC category check on both current and target categories.
 */
export async function updateAdminProduct(
  productId: string,
  data: AdminProductUpdateInput,
  user: StaffUser,
  options?: { ip?: string }
): Promise<IProduct> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new BadRequestError("Некорректный идентификатор товара");
  }

  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    deletedAt: null,
  });

  if (!product) {
    throw new NotFoundError("Товар не найден");
  }

  // 1. RBAC check on CURRENT category
  checkCategoryAccess(user, product.categoryId);

  // 2. RBAC check on NEW category if changed
  if (data.categoryId && data.categoryId !== product.categoryId.toString()) {
    checkCategoryAccess(user, data.categoryId);

    if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
      throw new BadRequestError("Некорректный идентификатор новой категории");
    }
    const catExists = await Category.findById(data.categoryId).lean();
    if (!catExists) {
      throw new NotFoundError("Новая категория не существует");
    }
    product.categoryId = new mongoose.Types.ObjectId(data.categoryId);
  }

  // 3. Brand check if changed
  if (data.brandId && data.brandId !== product.brandId.toString()) {
    if (!mongoose.Types.ObjectId.isValid(data.brandId)) {
      throw new BadRequestError("Некорректный идентификатор бренда");
    }
    const brandExists = await Brand.findById(data.brandId).lean();
    if (!brandExists) {
      throw new NotFoundError("Указанный бренд не существует");
    }
    product.brandId = new mongoose.Types.ObjectId(data.brandId);
  }

  // 4. SKU uniqueness check if changed
  if (data.sku && data.sku !== product.sku) {
    const existingSku = await Product.findOne({
      sku: data.sku,
      _id: { $ne: product._id },
      deletedAt: null,
    }).lean();
    if (existingSku) {
      throw new ConflictError(`Товар с артикулом "${data.sku}" уже существует`);
    }
    product.sku = data.sku;
  }

  // 5. Slug uniqueness check if changed
  if (data.slug && data.slug !== product.slug) {
    const existingSlug = await Product.findOne({
      slug: data.slug,
      _id: { $ne: product._id },
      deletedAt: null,
    }).lean();
    if (existingSlug) {
      throw new ConflictError(
        `Товар с URL-идентификатором (slug) "${data.slug}" уже существует`
      );
    }
    product.slug = data.slug;
  }

  // Track previous values for audit logging
  const oldPrice = product.price;
  const oldDiscountPrice = product.discountPrice;
  const oldStock = product.stockQuantity;
  const oldPublished = product.isPublished;

  const priceChanged =
    (data.price !== undefined && data.price !== oldPrice) ||
    (data.discountPrice !== undefined && data.discountPrice !== oldDiscountPrice);
  const stockChanged =
    data.stockQuantity !== undefined && data.stockQuantity !== oldStock;
  const publishedChanged =
    data.isPublished !== undefined && data.isPublished !== oldPublished;

  // 6. Mutate other fields
  if (data.title !== undefined) product.title = data.title;
  if (data.description !== undefined) product.description = data.description;
  if (data.price !== undefined) product.price = data.price;
  if (data.discountPrice !== undefined) product.discountPrice = data.discountPrice;
  if (data.stockQuantity !== undefined) product.stockQuantity = data.stockQuantity;
  if (data.isPublished !== undefined) product.isPublished = data.isPublished;
  if (data.images !== undefined) product.images = data.images;
  if (data.attributes !== undefined) product.attributes = data.attributes;

  await product.save();

  await product.populate([
    { path: "categoryId", select: "title slug" },
    { path: "brandId", select: "title slug logoUrl" },
  ]);

  // 7. Audit log triggers (T12, req 62)
  if (priceChanged) {
    await audit(
      "product.price_change",
      "Product",
      product._id.toString(),
      {
        title: product.title,
        sku: product.sku,
        oldPrice,
        newPrice: product.price,
        oldDiscountPrice,
        newDiscountPrice: product.discountPrice,
        staffName: user.name || user.email,
        staffRole: user.role,
      },
      {
        userId: user.id || null,
        ip: options?.ip || "",
        userEmail: user.email,
        userName: user.name,
      }
    ).catch((err) => console.error("[Audit Error on product price change]", err));
  }

  if (stockChanged) {
    await audit(
      "product.stock_change",
      "Product",
      product._id.toString(),
      {
        title: product.title,
        sku: product.sku,
        oldStock,
        newStock: product.stockQuantity,
        staffName: user.name || user.email,
        staffRole: user.role,
      },
      {
        userId: user.id || null,
        ip: options?.ip || "",
        userEmail: user.email,
        userName: user.name,
      }
    ).catch((err) => console.error("[Audit Error on product stock change]", err));
  }

  if (publishedChanged && product.isPublished === false) {
    await audit(
      "product.deactivate",
      "Product",
      product._id.toString(),
      {
        title: product.title,
        sku: product.sku,
        isPublished: false,
        staffName: user.name || user.email,
        staffRole: user.role,
      },
      {
        userId: user.id || null,
        ip: options?.ip || "",
        userEmail: user.email,
        userName: user.name,
      }
    ).catch((err) => console.error("[Audit Error on product deactivation]", err));
  }

  return product;
}

/**
 * Deactivates a product (isPublished = false) without physical deletion, enforcing category RBAC.
 */
export async function deactivateAdminProduct(
  productId: string,
  user: StaffUser,
  options?: { ip?: string }
): Promise<IProduct> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new BadRequestError("Некорректный идентификатор товара");
  }

  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    deletedAt: null,
  });

  if (!product) {
    throw new NotFoundError("Товар не найден");
  }

  // Category RBAC check
  checkCategoryAccess(user, product.categoryId);

  product.isPublished = false;
  await product.save();

  await product.populate([
    { path: "categoryId", select: "title slug" },
    { path: "brandId", select: "title slug logoUrl" },
  ]);

  // Audit log deactivation (T12)
  await audit(
    "product.deactivate",
    "Product",
    product._id.toString(),
    {
      title: product.title,
      sku: product.sku,
      isPublished: false,
      staffName: user.name || user.email,
      staffRole: user.role,
    },
    {
      userId: user.id || null,
      ip: options?.ip || "",
      userEmail: user.email,
      userName: user.name,
    }
  ).catch((err) => console.error("[Audit Error on product deactivation]", err));

  return product;
}

/**
 * Toggles publication status of a product (isPublished = !isPublished), enforcing category RBAC.
 */
export async function togglePublishAdminProduct(
  productId: string,
  user: StaffUser,
  options?: { ip?: string }
): Promise<IProduct> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new BadRequestError("Некорректный идентификатор товара");
  }

  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    deletedAt: null,
  });

  if (!product) {
    throw new NotFoundError("Товар не найден");
  }

  checkCategoryAccess(user, product.categoryId);

  product.isPublished = !product.isPublished;
  await product.save();

  await product.populate([
    { path: "categoryId", select: "title slug" },
    { path: "brandId", select: "title slug logoUrl" },
  ]);

  // Audit log toggle (T12)
  await audit(
    product.isPublished ? "product.publish" : "product.deactivate",
    "Product",
    product._id.toString(),
    {
      title: product.title,
      sku: product.sku,
      isPublished: product.isPublished,
      staffName: user.name || user.email,
      staffRole: user.role,
    },
    {
      userId: user.id || null,
      ip: options?.ip || "",
      userEmail: user.email,
      userName: user.name,
    }
  ).catch((err) => console.error("[Audit Error on product toggle publish]", err));

  return product;
}

/**
 * Retrieves category options allowed for the current staff user.
 * - Admin gets all visible categories.
 * - Manager gets only categories present in their assignedCategoryIds.
 */
export async function getAdminCategories(
  user: StaffUser
): Promise<ICategory[]> {
  await connectToDatabase();

  const role = user?.role || "customer";
  if (role === "admin") {
    return Category.find().sort({ sortOrder: 1, title: 1 }).lean<ICategory[]>();
  }

  if (role === "manager") {
    const assigned = user.assignedCategoryIds || [];
    if (assigned.length === 0) return [];

    return Category.find({
      _id: { $in: assigned.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .sort({ sortOrder: 1, title: 1 })
      .lean<ICategory[]>();
  }

  throw new ForbiddenError("Недостаточно прав доступа");
}

/**
 * Retrieves all brands for selection in admin forms.
 */
export async function getAdminBrands(): Promise<IBrand[]> {
  await connectToDatabase();
  return Brand.find().sort({ title: 1 }).lean<IBrand[]>();
}
