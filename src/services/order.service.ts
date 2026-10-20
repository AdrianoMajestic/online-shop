import mongoose, { ClientSession } from "mongoose";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Order, IOrder, IOrderItemSnapshot } from "@/models/Order";
import { Product, IProduct } from "@/models/Product";
import { DeliveryMethod, IDeliveryMethod } from "@/models/DeliveryMethod";
import { PromoCode, IPromoCode } from "@/models/PromoCode";
import { Payment, IPayment } from "@/models/Payment";
import { Address, IAddress } from "@/models/Address";
import { Cart } from "@/models/Cart";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";
import {
  CreateOrderInput,
  ValidatePromoInput,
  CreateAddressInput,
} from "@/lib/validations/order";
import {
  calculateItemPrice,
  calculateOrderPrices,
  validatePromoCode,
  PricingItem,
} from "@/lib/pricing";

export interface CreateOrderResult {
  order: IOrder;
  payment: IPayment | null;
}

export interface ValidatedPromoResult {
  valid: boolean;
  promo: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderAmount: number;
  };
  discountAmount: number;
  totalAmount: number;
  finalAmount: number;
}

/**
 * Returns all currently active delivery methods sorted by price ascending
 */
export async function getActiveDeliveryMethods(): Promise<IDeliveryMethod[]> {
  await connectToDatabase();
  return DeliveryMethod.find({ isActive: true })
    .sort({ price: 1, _id: 1 })
    .lean<IDeliveryMethod[]>();
}

/**
 * Returns all saved delivery addresses for an authenticated user
 */
export async function getUserSavedAddresses(userId: string): Promise<IAddress[]> {
  await connectToDatabase();
  return Address.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IAddress[]>();
}

/**
 * Saves a new delivery address for an authenticated user
 */
export async function saveUserAddress(
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
 * Validates a promo code against actual catalog prices or provided total amount
 */
export async function validatePromoCodeService(
  input: ValidatePromoInput
): Promise<ValidatedPromoResult> {
  await connectToDatabase();

  const code = input.code.trim().toUpperCase();
  const promo = await PromoCode.findOne({ code }).lean<IPromoCode>();

  if (!promo) {
    throw new BadRequestError(`Промокод «${code}» не найден`, "INVALID_PROMO");
  }

  let totalAmount = input.totalAmount ?? 0;

  // If items are provided, calculate totalAmount strictly from database product prices
  if (input.items && input.items.length > 0) {
    const productIds = input.items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isPublished: true,
      deletedAt: null,
    }).lean<IProduct[]>();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const pricingItems: PricingItem[] = [];
    for (const item of input.items) {
      const prod = productMap.get(item.productId);
      if (prod) {
        pricingItems.push({
          price: prod.price,
          discountPrice: prod.discountPrice,
          quantity: item.quantity,
        });
      }
    }

    if (pricingItems.length > 0) {
      const prices = calculateOrderPrices({ items: pricingItems });
      totalAmount = prices.totalAmount;
    }
  }

  const validation = validatePromoCode(
    {
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount,
      validFrom: promo.validFrom,
      validTo: promo.validTo,
      usageLimit: promo.usageLimit,
      usedCount: promo.usedCount,
      isActive: promo.isActive,
    },
    totalAmount
  );

  if (!validation.valid) {
    throw new BadRequestError(
      validation.error || "Промокод не может быть применен к данному заказу",
      validation.errorCode || "INVALID_PROMO"
    );
  }

  return {
    valid: true,
    promo: {
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount,
    },
    discountAmount: validation.discountAmount,
    totalAmount,
    finalAmount: Math.max(0, totalAmount - validation.discountAmount),
  };
}

/**
 * Generates next unique human-readable order number (e.g. KB-10001)
 */
async function generateOrderNumber(session?: ClientSession): Promise<string> {
  const count = await Order.countDocuments({}, session ? { session } : {});
  let num = 10001 + count;
  let orderNumber = `KB-${num}`;

  let existing = await Order.findOne(
    { number: orderNumber },
    { _id: 1 },
    session ? { session } : {}
  );
  while (existing) {
    num += 1;
    orderNumber = `KB-${num}`;
    existing = await Order.findOne(
      { number: orderNumber },
      { _id: 1 },
      session ? { session } : {}
    );
  }
  return orderNumber;
}

/**
 * Creates an order inside a MongoDB replica set transaction,
 * or falls back to atomic conditional operations with compensation rollback
 * if replica set transactions are not supported by the MongoDB instance.
 */
export async function createOrder(
  input: CreateOrderInput,
  userId?: string | null
): Promise<CreateOrderResult> {
  await connectToDatabase();

  // 1. Initial product load and validation
  const productIds = input.items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    deletedAt: null,
  }).lean<IProduct[]>();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Check all requested products exist
  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new NotFoundError(
        `Товар с идентификатором ${item.productId} не найден`,
        "PRODUCT_NOT_FOUND"
      );
    }

    if (!product.isPublished) {
      throw new ConflictError(
        `Товар «${product.title}» в данный момент снят с продажи`,
        "PRODUCT_NOT_PUBLISHED"
      );
    }

    if (product.stockQuantity < item.quantity) {
      throw new ConflictError(
        `Недостаточно товара «${product.title}» на складе (в наличии: ${product.stockQuantity}, запрошено: ${item.quantity})`,
        "OUT_OF_STOCK",
        {
          productId: product._id.toString(),
          available: product.stockQuantity,
          requested: item.quantity,
        }
      );
    }
  }

  // 2. Validate delivery method
  const deliveryMethod = await DeliveryMethod.findById(
    input.deliveryMethodId
  ).lean<IDeliveryMethod>();

  if (!deliveryMethod || !deliveryMethod.isActive) {
    throw new BadRequestError(
      "Выбранный способ доставки не найден или не активен",
      "INVALID_DELIVERY_METHOD"
    );
  }

  // 3. Validate promo code if provided
  let promoDoc: IPromoCode | null = null;
  if (input.promoCode) {
    const promoCodeNormalized = input.promoCode.trim().toUpperCase();
    promoDoc = await PromoCode.findOne({ code: promoCodeNormalized }).lean<IPromoCode>();

    if (!promoDoc) {
      throw new BadRequestError(
        `Промокод «${promoCodeNormalized}» не найден`,
        "INVALID_PROMO"
      );
    }
  }

  // Prepare pricing items
  const pricingItems: PricingItem[] = input.items.map((it) => {
    const p = productMap.get(it.productId)!;
    return {
      price: p.price,
      discountPrice: p.discountPrice,
      quantity: it.quantity,
    };
  });

  // Calculate order financials strictly on server
  const pricingResult = calculateOrderPrices({
    items: pricingItems,
    promo: promoDoc
      ? {
          code: promoDoc.code,
          discountType: promoDoc.discountType,
          discountValue: promoDoc.discountValue,
          minOrderAmount: promoDoc.minOrderAmount,
          validFrom: promoDoc.validFrom,
          validTo: promoDoc.validTo,
          usageLimit: promoDoc.usageLimit,
          usedCount: promoDoc.usedCount,
          isActive: promoDoc.isActive,
        }
      : null,
    deliveryCost: deliveryMethod.price,
  });

  // If user passed promo code but validation failed in pricingResult
  if (promoDoc && pricingResult.discountAmount === 0) {
    const validation = validatePromoCode(
      {
        code: promoDoc.code,
        discountType: promoDoc.discountType,
        discountValue: promoDoc.discountValue,
        minOrderAmount: promoDoc.minOrderAmount,
        validFrom: promoDoc.validFrom,
        validTo: promoDoc.validTo,
        usageLimit: promoDoc.usageLimit,
        usedCount: promoDoc.usedCount,
        isActive: promoDoc.isActive,
      },
      pricingResult.totalAmount
    );
    if (!validation.valid) {
      throw new BadRequestError(
        validation.error || "Промокод не может быть применен к данному заказу",
        validation.errorCode || "INVALID_PROMO"
      );
    }
  }

  // 4. Try execution inside a MongoDB transaction, with compensation fallback
  let session: ClientSession | null = null;
  let useTransactions = true;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    // Replica set not configured or transactions not supported on this deployment
    useTransactions = false;
    if (session) {
      try {
        await session.endSession();
      } catch {
        // ignore
      }
      session = null;
    }
  }

  if (useTransactions && session) {
    try {
      const result = await executeTransactionalOrderCreation(
        input,
        userId,
        productMap,
        deliveryMethod,
        promoDoc,
        pricingResult,
        session
      );
      await session.commitTransaction();
      await session.endSession();
      return result;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        // ignore
      }
      try {
        await session.endSession();
      } catch {
        // ignore
      }

      // Check if error is due to transactions not supported on deployment
      const errMsg = error instanceof Error ? error.message : "";
      const isReplicaSetError =
        errMsg.includes("replica set") ||
        errMsg.includes("Transaction numbers are only allowed") ||
        (error as { code?: number }).code === 20;

      if (!isReplicaSetError) {
        throw error;
      }
      // If transactions failed due to deployment, fall through to compensation strategy
    }
  }

  // Fallback: Atomic conditional updates with compensation pattern
  return executeCompensatingOrderCreation(
    input,
    userId,
    productMap,
    deliveryMethod,
    promoDoc,
    pricingResult
  );
}

/**
 * Creates order inside an active MongoDB session transaction
 */
async function executeTransactionalOrderCreation(
  input: CreateOrderInput,
  userId: string | null | undefined,
  productMap: Map<string, IProduct>,
  deliveryMethod: IDeliveryMethod,
  promoDoc: IPromoCode | null,
  pricingResult: ReturnType<typeof calculateOrderPrices>,
  session: ClientSession
): Promise<CreateOrderResult> {
  // 1. Atomically decrement stock with conditional update
  for (const item of input.items) {
    const p = productMap.get(item.productId)!;
    const stockUpdateRes = await Product.updateOne(
      {
        _id: item.productId,
        stockQuantity: { $gte: item.quantity },
      },
      {
        $inc: { stockQuantity: -item.quantity },
      },
      { session }
    );

    if (stockUpdateRes.modifiedCount === 0) {
      throw new ConflictError(
        `Недостаточно товара «${p.title}» на складе для оформления заказа`,
        "OUT_OF_STOCK",
        { productId: p._id.toString() }
      );
    }
  }

  // 2. Atomically increment promo code usedCount if promo was applied
  if (promoDoc && pricingResult.discountAmount > 0) {
    const promoUpdateQuery: mongoose.FilterQuery<IPromoCode> = {
      _id: promoDoc._id,
      isActive: true,
    };
    if (promoDoc.usageLimit > 0) {
      promoUpdateQuery.usedCount = { $lt: promoDoc.usageLimit };
    }

    const promoUpdateRes = await PromoCode.updateOne(
      promoUpdateQuery,
      { $inc: { usedCount: 1 } },
      { session }
    );

    if (promoUpdateRes.modifiedCount === 0) {
      throw new ConflictError(
        "Лимит использований промокода исчерпан другим покупателем",
        "PROMO_LIMIT_REACHED"
      );
    }
  }

  // 3. Generate unique order number
  const orderNumber = await generateOrderNumber(session);

  // 4. Build snapshots
  const itemSnapshots: IOrderItemSnapshot[] = input.items.map((it) => {
    const p = productMap.get(it.productId)!;
    const pricePerUnit = calculateItemPrice(p);
    return {
      productId: p._id,
      sku: p.sku,
      title: p.title,
      quantity: it.quantity,
      pricePerUnit,
      totalPrice: pricePerUnit * it.quantity,
    };
  });

  // 5. Create Order document
  const orderDocs = await Order.create(
    [
      {
        number: orderNumber,
        userId: userId ?? null,
        contact: {
          fullName: input.contact.fullName,
          phone: input.contact.phone,
          email: input.contact.email,
        },
        shippingAddress: {
          city: input.shippingAddress.city,
          street: input.shippingAddress.street,
          house: input.shippingAddress.house,
          apartment: input.shippingAddress.apartment || "",
          postalCode: input.shippingAddress.postalCode,
          comment: input.shippingAddress.comment || "",
        },
        delivery: {
          methodId: deliveryMethod._id,
          title: deliveryMethod.title,
          price: deliveryMethod.price,
        },
        items: itemSnapshots,
        promo:
          promoDoc && pricingResult.appliedPromo
            ? {
                promoCodeId: promoDoc._id,
                code: promoDoc.code,
                discountAmount: pricingResult.appliedPromo.discountAmount,
              }
            : null,
        totalAmount: pricingResult.totalAmount,
        discountAmount: pricingResult.discountAmount,
        deliveryCost: pricingResult.deliveryCost,
        finalAmount: pricingResult.finalAmount,
        status: "new",
        paymentMethod: input.paymentMethod,
        customerComment: input.customerComment || "",
        managerComments: [],
        statusHistory: [
          {
            from: "none",
            to: "new",
            byUserId: userId ? (userId as unknown as mongoose.Types.ObjectId) : null,
            at: new Date(),
          },
        ],
      },
    ],
    { session }
  );

  const order = orderDocs[0];

  // 6. Create Payment record for online payment
  let payment: IPayment | null = null;
  if (input.paymentMethod === "card_online") {
    const paymentDocs = await Payment.create(
      [
        {
          orderId: order._id,
          provider: "mock",
          externalPaymentId: `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          method: "card_online",
          status: "pending",
          amount: order.finalAmount,
          paidAt: null,
        },
      ],
      { session }
    );
    payment = paymentDocs[0];
  }

  // 7. Clear user cart in DB if user is logged in
  if (userId) {
    await Cart.updateOne(
      { userId },
      { $set: { items: [] } },
      { session }
    );
  }

  // 8. Optionally save address for authorized user
  if (userId && input.saveAddress) {
    await Address.create(
      [
        {
          userId,
          city: input.shippingAddress.city,
          street: input.shippingAddress.street,
          house: input.shippingAddress.house,
          apartment: input.shippingAddress.apartment || "",
          postalCode: input.shippingAddress.postalCode,
          comment: input.shippingAddress.comment || "",
        },
      ],
      { session }
    );
  }

  return { order, payment };
}

/**
 * Executes order creation with atomic conditional updates and compensation rollback
 * when MongoDB replica set multi-document transactions are unavailable
 */
async function executeCompensatingOrderCreation(
  input: CreateOrderInput,
  userId: string | null | undefined,
  productMap: Map<string, IProduct>,
  deliveryMethod: IDeliveryMethod,
  promoDoc: IPromoCode | null,
  pricingResult: ReturnType<typeof calculateOrderPrices>
): Promise<CreateOrderResult> {
  const decrementedProducts: Array<{ productId: string; quantity: number }> = [];
  let promoIncremented = false;

  try {
    // 1. Atomically decrement each product's stock with { stockQuantity: { $gte: q } }
    for (const item of input.items) {
      const p = productMap.get(item.productId)!;
      const res = await Product.updateOne(
        {
          _id: item.productId,
          stockQuantity: { $gte: item.quantity },
        },
        {
          $inc: { stockQuantity: -item.quantity },
        }
      );

      if (res.modifiedCount === 0) {
        throw new ConflictError(
          `Недостаточно товара «${p.title}» на складе для оформления заказа`,
          "OUT_OF_STOCK",
          { productId: p._id.toString() }
        );
      }

      decrementedProducts.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // 2. Atomically increment promo code usedCount if applied
    if (promoDoc && pricingResult.discountAmount > 0) {
      const promoQuery: mongoose.FilterQuery<IPromoCode> = {
        _id: promoDoc._id,
        isActive: true,
      };
      if (promoDoc.usageLimit > 0) {
        promoQuery.usedCount = { $lt: promoDoc.usageLimit };
      }

      const promoRes = await PromoCode.updateOne(promoQuery, {
        $inc: { usedCount: 1 },
      });

      if (promoRes.modifiedCount === 0) {
        throw new ConflictError(
          "Лимит использований промокода исчерпан другим покупателем",
          "PROMO_LIMIT_REACHED"
        );
      }
      promoIncremented = true;
    }

    // 3. Generate unique order number
    const orderNumber = await generateOrderNumber();

    // 4. Build snapshots
    const itemSnapshots: IOrderItemSnapshot[] = input.items.map((it) => {
      const p = productMap.get(it.productId)!;
      const pricePerUnit = calculateItemPrice(p);
      return {
        productId: p._id,
        sku: p.sku,
        title: p.title,
        quantity: it.quantity,
        pricePerUnit,
        totalPrice: pricePerUnit * it.quantity,
      };
    });

    // 5. Create Order document
    const order = await Order.create({
      number: orderNumber,
      userId: userId ?? null,
      contact: {
        fullName: input.contact.fullName,
        phone: input.contact.phone,
        email: input.contact.email,
      },
      shippingAddress: {
        city: input.shippingAddress.city,
        street: input.shippingAddress.street,
        house: input.shippingAddress.house,
        apartment: input.shippingAddress.apartment || "",
        postalCode: input.shippingAddress.postalCode,
        comment: input.shippingAddress.comment || "",
      },
      delivery: {
        methodId: deliveryMethod._id,
        title: deliveryMethod.title,
        price: deliveryMethod.price,
      },
      items: itemSnapshots,
      promo:
        promoDoc && pricingResult.appliedPromo
          ? {
              promoCodeId: promoDoc._id,
              code: promoDoc.code,
              discountAmount: pricingResult.appliedPromo.discountAmount,
            }
          : null,
      totalAmount: pricingResult.totalAmount,
      discountAmount: pricingResult.discountAmount,
      deliveryCost: pricingResult.deliveryCost,
      finalAmount: pricingResult.finalAmount,
      status: "new",
      paymentMethod: input.paymentMethod,
      customerComment: input.customerComment || "",
      managerComments: [],
      statusHistory: [
        {
          from: "none",
          to: "new",
          byUserId: userId ? (userId as unknown as mongoose.Types.ObjectId) : null,
          at: new Date(),
        },
      ],
    });

    // 6. Create Payment record for online payment
    let payment: IPayment | null = null;
    if (input.paymentMethod === "card_online") {
      try {
        payment = await Payment.create({
          orderId: order._id,
          provider: "mock",
          externalPaymentId: `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          method: "card_online",
          status: "pending",
          amount: order.finalAmount,
          paidAt: null,
        });
      } catch (paymentError) {
        // Compensation if payment creation fails
        await Order.findByIdAndDelete(order._id);
        throw paymentError;
      }
    }

    // 7. Clear user cart in DB if user is logged in
    if (userId) {
      await Cart.updateOne(
        { userId },
        { $set: { items: [] } }
      ).catch((err) => {
        console.error("Non-fatal: failed to clear user cart after order:", err);
      });
    }

    // 8. Optionally save address for authorized user
    if (userId && input.saveAddress) {
      await Address.create({
        userId,
        city: input.shippingAddress.city,
        street: input.shippingAddress.street,
        house: input.shippingAddress.house,
        apartment: input.shippingAddress.apartment || "",
        postalCode: input.shippingAddress.postalCode,
        comment: input.shippingAddress.comment || "",
      }).catch((err) => {
        console.error("Non-fatal: failed to save user address:", err);
      });
    }

    return { order, payment };
  } catch (error) {
    // COMPENSATION ROLLBACK: Revert promo code increment and product stock decrements
    if (promoIncremented && promoDoc) {
      await PromoCode.updateOne(
        { _id: promoDoc._id },
        { $inc: { usedCount: -1 } }
      ).catch((err) => console.error("Compensation error rolling back promo:", err));
    }

    for (const dec of decrementedProducts) {
      await Product.updateOne(
        { _id: dec.productId },
        { $inc: { stockQuantity: dec.quantity } }
      ).catch((err) => console.error("Compensation error rolling back product stock:", err));
    }

    throw error;
  }
}
