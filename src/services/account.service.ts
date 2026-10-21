import mongoose from "mongoose";
import { connectToDatabase, getMongoDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Order, IOrder } from "@/models/Order";
import { Address, IAddress } from "@/models/Address";
import { Product, IProduct } from "@/models/Product";
import { Cart } from "@/models/Cart";
import { PromoCode } from "@/models/PromoCode";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import {
  UpdateProfileInput,
  ChangePasswordInput,
  UpdateConsentsInput,
} from "@/lib/validations/user";
import { CreateAddressInput } from "@/lib/validations/order";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  consents?: {
    personalData?: { given?: boolean; at?: string | Date };
    marketing?: { given?: boolean; at?: string | Date };
  };
  createdAt?: string | Date;
}

export interface RepeatOrderResult {
  success: boolean;
  addedCount: number;
  outOfStockCount: number;
  message: string;
  addedItems: Array<{
    productId: string;
    title: string;
    quantity: number;
  }>;
  unavailableItems: Array<{
    productId: string;
    title: string;
    reason: string;
  }>;
}

/**
 * Retrieves full user profile information from database
 */
export async function getUserProfile(userId: string): Promise<UserProfileData> {
  if (!userId) {
    throw new NotFoundError("Пользователь не найден");
  }

  await connectToDatabase();
  const db = getMongoDb();

  const queryConditions: Array<Record<string, unknown>> = [
    { _id: userId as never },
    { id: userId },
  ];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    queryConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
  }

  const user = await db.collection("user").findOne({
    $or: queryConditions,
  });

  if (!user) {
    throw new NotFoundError("Пользователь не найден");
  }

  return {
    id: String(user.id || user._id),
    name: user.name || "",
    email: user.email || "",
    role: user.role || "customer",
    phone: user.phone || "",
    consents: user.consents || {
      personalData: { given: true, at: user.createdAt || new Date() },
      marketing: { given: false, at: user.createdAt || new Date() },
    },
    createdAt: user.createdAt,
  };
}

/**
 * Updates basic user profile data (name, phone)
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<{ name: string; phone: string }> {
  if (!userId) {
    throw new NotFoundError("Пользователь не найден");
  }

  await connectToDatabase();
  const db = getMongoDb();

  const queryConditions: Array<Record<string, unknown>> = [
    { _id: userId as never },
    { id: userId },
  ];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    queryConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
  }

  const updateResult = await db.collection("user").updateOne(
    {
      $or: queryConditions,
    },
    {
      $set: {
        name: input.name,
        phone: input.phone || "",
        updatedAt: new Date(),
      },
    }
  );

  if (updateResult.matchedCount === 0) {
    throw new NotFoundError("Пользователь не найден");
  }

  return {
    name: input.name,
    phone: input.phone || "",
  };
}

/**
 * Changes user password using Better Auth verification and hashing
 */
export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
  headers?: Headers
): Promise<{ success: boolean; message: string }> {
  try {
    if (!headers) {
      throw new BadRequestError("Необходимы заголовки сессии для смены пароля");
    }

    // Call Better Auth change password API endpoint
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
      headers,
    });

    return {
      success: true,
      message: "Пароль успешно изменен",
    };
  } catch (error: unknown) {
    // Detect Better Auth invalid password errors
    const errObj = error as { body?: { message?: string }; message?: string };
    const errorMessage =
      errObj?.body?.message || errObj?.message || String(error);
    if (
      errorMessage.includes("INVALID_PASSWORD") ||
      errorMessage.includes("Invalid password") ||
      errorMessage.includes("incorrect")
    ) {
      throw new BadRequestError("Неверный текущий пароль", "INVALID_PASSWORD");
    }
    throw error;
  }
}

/**
 * Updates user consents (152-FZ Personal Data and Marketing)
 */
export async function updateUserConsents(
  userId: string,
  input: UpdateConsentsInput
): Promise<{
  personalData?: { given?: boolean; at?: Date };
  marketing?: { given?: boolean; at?: Date };
}> {
  if (!userId) {
    throw new NotFoundError("Пользователь не найден");
  }

  await connectToDatabase();
  const db = getMongoDb();

  const queryConditions: Array<Record<string, unknown>> = [
    { _id: userId as never },
    { id: userId },
  ];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    queryConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
  }

  const user = await db.collection("user").findOne({
    $or: queryConditions,
  });

  if (!user) {
    throw new NotFoundError("Пользователь не найден");
  }

  const existingConsents = user.consents || {};
  const now = new Date();

  const updatedConsents = {
    ...existingConsents,
    ...(input.personalData !== undefined
      ? { personalData: { given: Boolean(input.personalData), at: now } }
      : {}),
    ...(input.marketing !== undefined
      ? { marketing: { given: Boolean(input.marketing), at: now } }
      : {}),
  };

  await db.collection("user").updateOne(
    { _id: user._id },
    {
      $set: {
        consents: updatedConsents,
        updatedAt: now,
      },
    }
  );

  return updatedConsents;
}

// -------------------------------------------------------------
// ADDRESS BOOK MANAGEMENT (Strict Server-Side Ownership Check)
// -------------------------------------------------------------

/**
 * Returns all saved delivery addresses belonging to the authenticated user
 */
export async function getUserAddresses(userId: string): Promise<IAddress[]> {
  await connectToDatabase();
  return Address.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IAddress[]>();
}

/**
 * Returns a specific address with strict ownership validation (403/404)
 */
export async function getUserAddressById(
  addressId: string,
  userId: string
): Promise<IAddress> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new NotFoundError("Адрес не найден");
  }

  const address = await Address.findById(addressId);
  if (!address) {
    throw new NotFoundError("Адрес не найден");
  }

  // Strict ownership check
  if (String(address.userId) !== String(userId)) {
    throw new ForbiddenError("Доступ запрещен: чужой адрес");
  }

  return address;
}

/**
 * Creates a new delivery address for the user
 */
export async function createUserAddress(
  userId: string,
  input: CreateAddressInput
): Promise<IAddress> {
  await connectToDatabase();

  const address = await Address.create({
    userId,
    city: input.city,
    street: input.street,
    house: input.house,
    apartment: input.apartment || "",
    postalCode: input.postalCode,
    comment: input.comment || "",
  });

  return address;
}

/**
 * Updates an address with strict ownership verification
 */
export async function updateUserAddress(
  addressId: string,
  userId: string,
  input: CreateAddressInput
): Promise<IAddress> {
  const address = await getUserAddressById(addressId, userId);

  address.city = input.city;
  address.street = input.street;
  address.house = input.house;
  address.apartment = input.apartment || "";
  address.postalCode = input.postalCode;
  address.comment = input.comment || "";

  await address.save();
  return address;
}

/**
 * Deletes an address with strict ownership verification
 */
export async function deleteUserAddress(
  addressId: string,
  userId: string
): Promise<{ success: boolean }> {
  const address = await getUserAddressById(addressId, userId);
  await Address.deleteOne({ _id: address._id });
  return { success: true };
}

// -------------------------------------------------------------
// ORDER HISTORY & DETAILS (Strict Server-Side Ownership Check)
// -------------------------------------------------------------

/**
 * Returns orders for the authenticated user with optional status filter
 */
export async function getUserOrders(
  userId: string,
  statusFilter?: string | null
): Promise<IOrder[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    userId,
    deletedAt: null,
  };

  if (
    statusFilter &&
    statusFilter !== "all" &&
    ["new", "paid", "processing", "shipped", "completed", "cancelled"].includes(
      statusFilter
    )
  ) {
    query.status = statusFilter;
  }

  return Order.find(query)
    .sort({ createdAt: -1 })
    .lean<IOrder[]>();
}

/**
 * Returns detailed order information with strict ownership check (403/404)
 */
export async function getUserOrderById(
  orderIdOrNumber: string,
  userId: string
): Promise<IOrder> {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(orderIdOrNumber);
  const query = isObjectId
    ? {
        $or: [
          { _id: new mongoose.Types.ObjectId(orderIdOrNumber) },
          { number: orderIdOrNumber },
        ],
      }
    : { number: orderIdOrNumber };

  const order = await Order.findOne(query);

  if (!order || order.deletedAt) {
    throw new NotFoundError("Заказ не найден");
  }

  // Strict server-side ownership protection
  if (String(order.userId) !== String(userId)) {
    throw new ForbiddenError("Доступ запрещен: чужой заказ");
  }

  return order;
}

/**
 * Cancels user order strictly in 'new' status (Assumption A-11)
 * Restores product stock quantities and promo code usage (A-06)
 */
export async function cancelUserOrder(
  orderIdOrNumber: string,
  userId: string
): Promise<IOrder> {
  const order = await getUserOrderById(orderIdOrNumber, userId);

  // Assumption A-11: customer cancellation allowed strictly in 'new' status
  if (order.status !== "new") {
    throw new ConflictError(
      `Отмена заказа покупателем возможна только в статусе «Новый». Текущий статус: «${order.status}»`,
      "ORDER_CANNOT_BE_CANCELLED"
    );
  }

  // 1. Stock compensation: restore reserved product quantities (A-06)
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stockQuantity: item.quantity } }
    ).catch((err) => {
      console.error(
        `Failed to restore stock for product ${item.productId} during cancellation:`,
        err
      );
    });
  }

  // 2. Promo code compensation: decrement usedCount if applicable
  if (order.promo?.promoCodeId) {
    await PromoCode.updateOne(
      { _id: order.promo.promoCodeId },
      { $inc: { usedCount: -1 } }
    ).catch((err) => {
      console.error(
        `Failed to rollback promo code ${order.promo?.code} during cancellation:`,
        err
      );
    });
  }

  // 3. Update status to 'cancelled' and append to statusHistory
  const previousStatus = order.status;
  order.status = "cancelled";
  order.statusHistory.push({
    from: previousStatus,
    to: "cancelled",
    byUserId: (userId as unknown) as mongoose.Types.ObjectId,
    at: new Date(),
  });

  await order.save();
  return order;
}

/**
 * Repeats an existing order: adds available products from the order to user cart
 * Validates current catalog stock and published status.
 */
export async function repeatUserOrder(
  orderIdOrNumber: string,
  userId: string
): Promise<RepeatOrderResult> {
  const order = await getUserOrderById(orderIdOrNumber, userId);

  const productIds = order.items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
  }).lean<IProduct[]>();

  const productMap = new Map<string, IProduct>();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const addedItems: RepeatOrderResult["addedItems"] = [];
  const unavailableItems: RepeatOrderResult["unavailableItems"] = [];

  // Categorize items
  for (const item of order.items) {
    const pId = item.productId.toString();
    const product = productMap.get(pId);

    if (!product || product.deletedAt || !product.isPublished) {
      unavailableItems.push({
        productId: pId,
        title: item.title,
        reason: "Товар снят с продажи или удален",
      });
      continue;
    }

    if (product.stockQuantity <= 0) {
      unavailableItems.push({
        productId: pId,
        title: item.title,
        reason: "Товар временно закончился на складе",
      });
      continue;
    }

    // Product is available
    const quantityToAdd = Math.min(item.quantity, product.stockQuantity);
    addedItems.push({
      productId: pId,
      title: product.title,
      quantity: quantityToAdd,
    });
  }

  if (addedItems.length === 0) {
    return {
      success: false,
      addedCount: 0,
      outOfStockCount: unavailableItems.length,
      message:
        "К сожалению, ни один товар из этого заказа сейчас недоступен для покупки",
      addedItems: [],
      unavailableItems,
    };
  }

  // Fetch or create user Cart in MongoDB
  let userCart = await Cart.findOne({ userId });
  if (!userCart) {
    userCart = new Cart({
      userId,
      items: [],
    });
  }

  const cartMap = new Map<string, number>();
  for (const cItem of userCart.items) {
    cartMap.set(cItem.productId.toString(), cItem.quantity);
  }

  for (const item of addedItems) {
    const product = productMap.get(item.productId)!;
    const currentQty = cartMap.get(item.productId) || 0;
    // Cap at physical stock quantity
    const finalQty = Math.min(currentQty + item.quantity, product.stockQuantity);
    cartMap.set(item.productId, finalQty);
  }

  userCart.items = Array.from(cartMap.entries()).map(([productId, quantity]) => ({
    productId: new mongoose.Types.ObjectId(productId),
    quantity,
  }));

  await userCart.save();

  const message =
    unavailableItems.length > 0
      ? `В корзину добавлено товаров: ${addedItems.length}. Недоступно позиций: ${unavailableItems.length}.`
      : `Все позиции заказа (${addedItems.length}) успешно добавлены в корзину!`;

  return {
    success: true,
    addedCount: addedItems.length,
    outOfStockCount: unavailableItems.length,
    message,
    addedItems,
    unavailableItems,
  };
}
