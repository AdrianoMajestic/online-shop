import mongoose from "mongoose";
import { connectToDatabase, getMongoDb } from "@/lib/db";
import { Category, ICategory } from "@/models/Category";
import { Brand, IBrand } from "@/models/Brand";
import { DeliveryMethod, IDeliveryMethod } from "@/models/DeliveryMethod";
import { PromoCode, IPromoCode } from "@/models/PromoCode";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/slug";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";
import {
  AdminCategoryCreateInput,
  AdminCategoryUpdateInput,
  AdminBrandCreateInput,
  AdminBrandUpdateInput,
  AdminDeliveryMethodCreateInput,
  AdminDeliveryMethodUpdateInput,
  AdminPromoCodeCreateInput,
  AdminPromoCodeUpdateInput,
  AdminUsersQuery,
} from "@/lib/validations/admin-directory";

// ==================== CATEGORIES ====================

export interface AdminCategoryItem {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  parentTitle?: string | null;
  description: string;
  isVisible: boolean;
  sortOrder: number;
  productsCount: number;
  childrenCount: number;
  createdAt: string;
}

/**
 * Returns full flat list or tree of categories with products and subcategories count
 */
export async function getAdminCategoriesList(): Promise<AdminCategoryItem[]> {
  await connectToDatabase();

  const categories = await Category.find().sort({ sortOrder: 1, title: 1 }).lean();
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

  // Count products per category
  const productCounts = await Product.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);
  const productCountMap = new Map(productCounts.map((p) => [p._id?.toString(), p.count]));

  // Count children per category
  const childCounts = new Map<string, number>();
  for (const c of categories) {
    if (c.parentId) {
      const pId = c.parentId.toString();
      childCounts.set(pId, (childCounts.get(pId) || 0) + 1);
    }
  }

  return categories.map((c) => {
    const parent = c.parentId ? categoryMap.get(c.parentId.toString()) : null;
    return {
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      parentId: c.parentId ? c.parentId.toString() : null,
      parentTitle: parent ? parent.title : null,
      description: c.description || "",
      isVisible: c.isVisible ?? true,
      sortOrder: c.sortOrder ?? 0,
      productsCount: productCountMap.get(c._id.toString()) || 0,
      childrenCount: childCounts.get(c._id.toString()) || 0,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    };
  });
}

export async function getAdminCategoryById(id: string): Promise<ICategory> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError("Категория не найдена");
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError("Категория не найдена");
  }
  return category;
}

export async function createAdminCategory(input: AdminCategoryCreateInput): Promise<ICategory> {
  await connectToDatabase();

  let slug = input.slug?.trim() || slugify(input.title);
  if (!slug) {
    slug = `cat-${Date.now()}`;
  }

  // Ensure unique slug
  const existingSlug = await Category.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  let parentObjectId: mongoose.Types.ObjectId | null = null;
  if (input.parentId) {
    if (!mongoose.Types.ObjectId.isValid(input.parentId)) {
      throw new BadRequestError("Некорректный ID родительской категории");
    }
    const parent = await Category.findById(input.parentId);
    if (!parent) {
      throw new NotFoundError("Родительская категория не найдена");
    }
    parentObjectId = parent._id as mongoose.Types.ObjectId;
  }

  const category = await Category.create({
    title: input.title.trim(),
    slug,
    parentId: parentObjectId,
    description: input.description?.trim() || "",
    isVisible: input.isVisible ?? true,
    sortOrder: input.sortOrder ?? 0,
  });

  return category;
}

export async function updateAdminCategory(
  id: string,
  input: AdminCategoryUpdateInput
): Promise<ICategory> {
  await connectToDatabase();
  const category = await getAdminCategoryById(id);

  if (input.title !== undefined) {
    category.title = input.title.trim();
  }

  if (input.slug !== undefined && input.slug.trim()) {
    const newSlug = input.slug.trim().toLowerCase();
    if (newSlug !== category.slug) {
      const existing = await Category.findOne({ slug: newSlug, _id: { $ne: category._id } });
      if (existing) {
        throw new ConflictError(`Категория со slug "${newSlug}" уже существует`);
      }
      category.slug = newSlug;
    }
  }

  if (input.parentId !== undefined) {
    if (input.parentId === null || input.parentId === "") {
      category.parentId = null;
    } else {
      if (input.parentId === id) {
        throw new BadRequestError("Категория не может быть родительской для самой себя");
      }
      if (!mongoose.Types.ObjectId.isValid(input.parentId)) {
        throw new BadRequestError("Некорректный ID родительской категории");
      }
      const parent = await Category.findById(input.parentId);
      if (!parent) {
        throw new NotFoundError("Родительская категория не найдена");
      }
      category.parentId = parent._id as mongoose.Types.ObjectId;
    }
  }

  if (input.description !== undefined) {
    category.description = input.description.trim();
  }

  if (input.isVisible !== undefined) {
    category.isVisible = input.isVisible;
  }

  if (input.sortOrder !== undefined) {
    category.sortOrder = input.sortOrder;
  }

  await category.save();
  return category;
}

export async function deleteAdminCategory(id: string): Promise<{ success: boolean; message: string }> {
  await connectToDatabase();
  const category = await getAdminCategoryById(id);

  // Check if category has child categories
  const childrenCount = await Category.countDocuments({ parentId: category._id });
  if (childrenCount > 0) {
    throw new ConflictError(
      `Невозможно удалить категорию: у нее есть ${childrenCount} подкатегорий. Сначала удалите или переместите их.`
    );
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({ categoryId: category._id, deletedAt: null });
  if (productsCount > 0) {
    throw new ConflictError(
      `Невозможно удалить категорию: в ней находится ${productsCount} товаров. Сначала переместите товары или отключите видимость категории.`
    );
  }

  await Category.findByIdAndDelete(category._id);
  return { success: true, message: `Категория "${category.title}" успешно удалена` };
}

// ==================== BRANDS ====================

export interface AdminBrandItem {
  id: string;
  title: string;
  slug: string;
  logoUrl: string;
  description: string;
  productsCount: number;
  createdAt: string;
}

export async function getAdminBrandsList(): Promise<AdminBrandItem[]> {
  await connectToDatabase();

  const brands = await Brand.find().sort({ title: 1 }).lean();

  const productCounts = await Product.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$brandId", count: { $sum: 1 } } },
  ]);
  const productCountMap = new Map(productCounts.map((p) => [p._id?.toString(), p.count]));

  return brands.map((b) => ({
    id: b._id.toString(),
    title: b.title,
    slug: b.slug,
    logoUrl: b.logoUrl || "",
    description: b.description || "",
    productsCount: productCountMap.get(b._id.toString()) || 0,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : "",
  }));
}

export async function getAdminBrandById(id: string): Promise<IBrand> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError("Бренд не найден");
  }

  const brand = await Brand.findById(id);
  if (!brand) {
    throw new NotFoundError("Бренд не найден");
  }
  return brand;
}

export async function createAdminBrand(input: AdminBrandCreateInput): Promise<IBrand> {
  await connectToDatabase();

  let slug = input.slug?.trim() || slugify(input.title);
  if (!slug) {
    slug = `brand-${Date.now()}`;
  }

  const existingSlug = await Brand.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const brand = await Brand.create({
    title: input.title.trim(),
    slug,
    logoUrl: input.logoUrl?.trim() || "",
    description: input.description?.trim() || "",
  });

  return brand;
}

export async function updateAdminBrand(id: string, input: AdminBrandUpdateInput): Promise<IBrand> {
  await connectToDatabase();
  const brand = await getAdminBrandById(id);

  if (input.title !== undefined) {
    brand.title = input.title.trim();
  }

  if (input.slug !== undefined && input.slug.trim()) {
    const newSlug = input.slug.trim().toLowerCase();
    if (newSlug !== brand.slug) {
      const existing = await Brand.findOne({ slug: newSlug, _id: { $ne: brand._id } });
      if (existing) {
        throw new ConflictError(`Бренд со slug "${newSlug}" уже существует`);
      }
      brand.slug = newSlug;
    }
  }

  if (input.logoUrl !== undefined) {
    brand.logoUrl = input.logoUrl.trim();
  }

  if (input.description !== undefined) {
    brand.description = input.description.trim();
  }

  await brand.save();
  return brand;
}

export async function deleteAdminBrand(id: string): Promise<{ success: boolean; message: string }> {
  await connectToDatabase();
  const brand = await getAdminBrandById(id);

  const productsCount = await Product.countDocuments({ brandId: brand._id, deletedAt: null });
  if (productsCount > 0) {
    throw new ConflictError(
      `Невозможно удалить бренд: к нему привязано ${productsCount} товаров. Сначала переместите товары.`
    );
  }

  await Brand.findByIdAndDelete(brand._id);
  return { success: true, message: `Бренд "${brand.title}" успешно удален` };
}

// ==================== DELIVERY METHODS ====================

export interface AdminDeliveryMethodItem {
  id: string;
  code: string;
  title: string;
  price: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export async function getAdminDeliveryMethodsList(): Promise<AdminDeliveryMethodItem[]> {
  await connectToDatabase();
  const methods = await DeliveryMethod.find().sort({ price: 1, createdAt: 1 }).lean();

  return methods.map((m) => ({
    id: m._id.toString(),
    code: m.code,
    title: m.title,
    price: m.price,
    description: m.description || "",
    isActive: m.isActive ?? true,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : "",
  }));
}

export async function getAdminDeliveryMethodById(id: string): Promise<IDeliveryMethod> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError("Способ доставки не найден");
  }

  const method = await DeliveryMethod.findById(id);
  if (!method) {
    throw new NotFoundError("Способ доставки не найден");
  }
  return method;
}

export async function createAdminDeliveryMethod(
  input: AdminDeliveryMethodCreateInput
): Promise<IDeliveryMethod> {
  await connectToDatabase();

  const code = input.code.trim().toLowerCase();
  const existing = await DeliveryMethod.findOne({ code });
  if (existing) {
    throw new ConflictError(`Способ доставки с кодом "${code}" уже существует`);
  }

  const method = await DeliveryMethod.create({
    code,
    title: input.title.trim(),
    price: input.price,
    description: input.description?.trim() || "",
    isActive: input.isActive ?? true,
  });

  return method;
}

export async function updateAdminDeliveryMethod(
  id: string,
  input: AdminDeliveryMethodUpdateInput
): Promise<IDeliveryMethod> {
  await connectToDatabase();
  const method = await getAdminDeliveryMethodById(id);

  if (input.code !== undefined && input.code.trim()) {
    const newCode = input.code.trim().toLowerCase();
    if (newCode !== method.code) {
      const existing = await DeliveryMethod.findOne({ code: newCode, _id: { $ne: method._id } });
      if (existing) {
        throw new ConflictError(`Способ доставки с кодом "${newCode}" уже существует`);
      }
      method.code = newCode;
    }
  }

  if (input.title !== undefined) {
    method.title = input.title.trim();
  }

  if (input.price !== undefined) {
    method.price = input.price;
  }

  if (input.description !== undefined) {
    method.description = input.description.trim();
  }

  if (input.isActive !== undefined) {
    method.isActive = input.isActive;
  }

  await method.save();
  return method;
}

export async function deleteAdminDeliveryMethod(
  id: string
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase();
  const method = await getAdminDeliveryMethodById(id);

  await DeliveryMethod.findByIdAndDelete(method._id);
  return { success: true, message: `Способ доставки "${method.title}" успешно удален` };
}

// ==================== PROMO CODES ====================

export interface AdminPromoCodeItem {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  status: "active" | "expired" | "limit_reached" | "inactive";
  createdAt: string;
}

export async function getAdminPromoCodesList(): Promise<AdminPromoCodeItem[]> {
  await connectToDatabase();
  const codes = await PromoCode.find().sort({ createdAt: -1 }).lean();
  const now = new Date();

  return codes.map((c) => {
    let status: "active" | "expired" | "limit_reached" | "inactive" = "active";
    if (!c.isActive) {
      status = "inactive";
    } else if (new Date(c.validTo) < now) {
      status = "expired";
    } else if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) {
      status = "limit_reached";
    }

    return {
      id: c._id.toString(),
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount || 0,
      validFrom: new Date(c.validFrom).toISOString(),
      validTo: new Date(c.validTo).toISOString(),
      usageLimit: c.usageLimit || 0,
      usedCount: c.usedCount || 0,
      isActive: c.isActive ?? true,
      status,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    };
  });
}

export async function getAdminPromoCodeById(id: string): Promise<IPromoCode> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError("Промокод не найден");
  }

  const promo = await PromoCode.findById(id);
  if (!promo) {
    throw new NotFoundError("Промокод не найден");
  }
  return promo;
}

export async function createAdminPromoCode(input: AdminPromoCodeCreateInput): Promise<IPromoCode> {
  await connectToDatabase();

  const code = input.code.trim().toUpperCase();
  const existing = await PromoCode.findOne({ code });
  if (existing) {
    throw new ConflictError(`Промокод "${code}" уже существует`);
  }

  const promo = await PromoCode.create({
    code,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount ?? 0,
    validFrom: new Date(input.validFrom),
    validTo: new Date(input.validTo),
    usageLimit: input.usageLimit ?? 0,
    usedCount: 0,
    isActive: input.isActive ?? true,
  });

  return promo;
}

export async function updateAdminPromoCode(
  id: string,
  input: AdminPromoCodeUpdateInput
): Promise<IPromoCode> {
  await connectToDatabase();
  const promo = await getAdminPromoCodeById(id);

  if (input.code !== undefined && input.code.trim()) {
    const newCode = input.code.trim().toUpperCase();
    if (newCode !== promo.code) {
      const existing = await PromoCode.findOne({ code: newCode, _id: { $ne: promo._id } });
      if (existing) {
        throw new ConflictError(`Промокод "${newCode}" уже существует`);
      }
      promo.code = newCode;
    }
  }

  if (input.discountType !== undefined) {
    promo.discountType = input.discountType;
  }

  if (input.discountValue !== undefined) {
    promo.discountValue = input.discountValue;
  }

  if (input.minOrderAmount !== undefined) {
    promo.minOrderAmount = input.minOrderAmount;
  }

  if (input.validFrom !== undefined) {
    promo.validFrom = new Date(input.validFrom);
  }

  if (input.validTo !== undefined) {
    promo.validTo = new Date(input.validTo);
  }

  if (input.usageLimit !== undefined) {
    promo.usageLimit = input.usageLimit;
  }

  if (input.isActive !== undefined) {
    promo.isActive = input.isActive;
  }

  await promo.save();
  return promo;
}

export async function deleteAdminPromoCode(
  id: string
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase();
  const promo = await getAdminPromoCodeById(id);

  if (promo.usedCount > 0) {
    // Soft disable to preserve historical order integrity
    promo.isActive = false;
    await promo.save();
    return {
      success: true,
      message: `Промокод "${promo.code}" использовался в заказах (${promo.usedCount} раз) и был деактивирован вместо удаления`,
    };
  }

  await PromoCode.findByIdAndDelete(promo._id);
  return { success: true, message: `Промокод "${promo.code}" успешно удален` };
}

// ==================== PAYMENT METHODS (Req 50) ====================

export interface AdminPaymentMethodSetting {
  id: "card_online" | "cod";
  code: "card_online" | "cod";
  title: string;
  description: string;
  isActive: boolean;
}

export async function getAdminPaymentMethods(): Promise<AdminPaymentMethodSetting[]> {
  await connectToDatabase();
  const db = getMongoDb();

  const setting = await db.collection("settings").findOne({ key: "payment_methods" });
  const configured = (setting?.methods as Record<string, boolean>) || {};

  return [
    {
      id: "card_online",
      code: "card_online",
      title: "Онлайн-оплата картой",
      description: "Оплата банковскими картами через защищенный шлюз (эквайринг)",
      isActive: configured.card_online !== undefined ? configured.card_online : true,
    },
    {
      id: "cod",
      code: "cod",
      title: "Оплата при получении",
      description: "Наличными или картой курьеру при передаче заказа",
      isActive: configured.cod !== undefined ? configured.cod : true,
    },
  ];
}

export async function updateAdminPaymentMethod(
  code: "card_online" | "cod",
  isActive: boolean
): Promise<AdminPaymentMethodSetting> {
  await connectToDatabase();
  const db = getMongoDb();

  const currentMethods = await getAdminPaymentMethods();
  const updatedConfig: Record<string, boolean> = {};

  for (const m of currentMethods) {
    updatedConfig[m.code] = m.code === code ? isActive : m.isActive;
  }

  await db.collection("settings").updateOne(
    { key: "payment_methods" },
    { $set: { key: "payment_methods", methods: updatedConfig, updatedAt: new Date() } },
    { upsert: true }
  );

  const target = currentMethods.find((m) => m.code === code)!;
  return { ...target, isActive };
}

// ==================== USERS & RBAC ====================

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: "customer" | "manager" | "admin";
  phone: string;
  banned: boolean;
  banReason?: string;
  assignedCategoryIds: string[];
  assignedCategories?: { id: string; title: string }[];
  createdAt: string;
}

export interface AdminUsersListResult {
  users: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getAdminUsers(query: AdminUsersQuery): Promise<AdminUsersListResult> {
  await connectToDatabase();
  const db = getMongoDb();

  const filter: Record<string, unknown> = {};

  if (query.role && query.role !== "all") {
    filter.role = query.role;
  }

  if (query.status === "active") {
    filter.$or = [{ banned: false }, { banned: { $exists: false } }, { banned: null }];
  } else if (query.status === "banned") {
    filter.banned = true;
  }

  if (query.q && query.q.trim()) {
    const qRegex = new RegExp(query.q.trim(), "i");
    filter.$or = [{ name: qRegex }, { email: qRegex }, { phone: qRegex }];
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.max(1, Math.min(100, query.limit || 20));
  const skip = (page - 1) * limit;

  const total = await db.collection("user").countDocuments(filter);
  const rawUsers = await db
    .collection("user")
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // Load categories for manager category titles
  const allCategories = await Category.find({}, "_id title").lean();
  const catTitleMap = new Map(allCategories.map((c) => [c._id.toString(), c.title]));

  const users: AdminUserItem[] = rawUsers.map((u) => {
    const userId = u.id || u._id?.toString() || "";
    const assignedCategoryIds: string[] = Array.isArray(u.assignedCategoryIds)
      ? u.assignedCategoryIds.map((id: unknown) => String(id))
      : [];

    const assignedCategories = assignedCategoryIds
      .map((id) => ({ id, title: catTitleMap.get(id) || "Неизвестная категория" }))
      .filter(Boolean);

    return {
      id: userId,
      email: u.email || "",
      name: u.name || "Без имени",
      role: (u.role || "customer") as "customer" | "manager" | "admin",
      phone: u.phone || "",
      banned: u.banned === true,
      banReason: u.banReason || undefined,
      assignedCategoryIds,
      assignedCategories,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    };
  });

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async function findUserInDb(db: ReturnType<typeof getMongoDb>, userId: string) {
  const orConditions: Record<string, unknown>[] = [{ id: userId }, { _id: userId }];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
  }
  return db.collection("user").findOne({ $or: orConditions });
}

/**
 * Updates a user's role.
 * GUARANTEE: An administrator cannot revoke their own administrator role.
 */
export async function updateAdminUserRole(params: {
  currentAdminId: string;
  currentAdminEmail?: string;
  targetUserId: string;
  newRole: "customer" | "manager" | "admin";
}): Promise<{ id: string; role: string }> {
  await connectToDatabase();
  const db = getMongoDb();

  // Find target user
  const targetUser = await findUserInDb(db, params.targetUserId);

  if (!targetUser) {
    throw new NotFoundError("Пользователь не найден");
  }

  const targetId = (targetUser.id || targetUser._id?.toString()) as string;

  // Check self-protection rule
  const isSelf =
    targetId === params.currentAdminId ||
    (params.currentAdminEmail && targetUser.email?.toLowerCase() === params.currentAdminEmail.toLowerCase());

  if (isSelf && params.newRole !== "admin") {
    throw new ConflictError("Администратор не может лишить самого себя роли администратора");
  }

  await db.collection("user").updateOne(
    { _id: targetUser._id },
    {
      $set: {
        role: params.newRole,
        updatedAt: new Date(),
      },
    }
  );

  return { id: targetId, role: params.newRole };
}

/**
 * Toggles a user's ban status.
 * GUARANTEE: An administrator cannot ban themselves.
 */
export async function toggleAdminUserBan(params: {
  currentAdminId: string;
  currentAdminEmail?: string;
  targetUserId: string;
  banned: boolean;
  banReason?: string;
}): Promise<{ id: string; banned: boolean; banReason?: string }> {
  await connectToDatabase();
  const db = getMongoDb();

  const targetUser = await findUserInDb(db, params.targetUserId);

  if (!targetUser) {
    throw new NotFoundError("Пользователь не найден");
  }

  const targetId = (targetUser.id || targetUser._id?.toString()) as string;

  // Check self-protection rule
  const isSelf =
    targetId === params.currentAdminId ||
    (params.currentAdminEmail && targetUser.email?.toLowerCase() === params.currentAdminEmail.toLowerCase());

  if (isSelf && params.banned) {
    throw new ConflictError("Администратор не может заблокировать самого себя");
  }

  const updateSet: Record<string, unknown> = {
    banned: params.banned,
    isActive: !params.banned,
    updatedAt: new Date(),
  };

  if (params.banned) {
    updateSet.banReason = params.banReason || "Блокировка администратором системы";
    updateSet.banExpires = null;
  } else {
    updateSet.banReason = null;
    updateSet.banExpires = null;
  }

  await db.collection("user").updateOne({ _id: targetUser._id }, { $set: updateSet });

  // If banned, revoke active sessions
  if (params.banned) {
    await db.collection("session").deleteMany({
      $or: [{ userId: targetId }, { userId: targetUser._id }],
    });
  }

  return {
    id: targetId,
    banned: params.banned,
    banReason: params.banned ? (updateSet.banReason as string) : undefined,
  };
}

/**
 * Assigns manageable categories to a manager.
 */
export async function assignManagerCategories(params: {
  targetUserId: string;
  assignedCategoryIds: string[];
}): Promise<{ id: string; assignedCategoryIds: string[] }> {
  await connectToDatabase();
  const db = getMongoDb();

  const targetUser = await findUserInDb(db, params.targetUserId);

  if (!targetUser) {
    throw new NotFoundError("Пользователь не найден");
  }

  // Verify that all category IDs are valid ObjectIds and exist
  const validCategoryIds: string[] = [];
  for (const catId of params.assignedCategoryIds) {
    if (mongoose.Types.ObjectId.isValid(catId)) {
      const exists = await Category.exists({ _id: catId });
      if (exists) {
        validCategoryIds.push(catId);
      }
    }
  }

  await db.collection("user").updateOne(
    { _id: targetUser._id },
    {
      $set: {
        assignedCategoryIds: validCategoryIds,
        updatedAt: new Date(),
      },
    }
  );

  return {
    id: targetUser.id || targetUser._id?.toString(),
    assignedCategoryIds: validCategoryIds,
  };
}
