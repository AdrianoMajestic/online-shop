import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Payment, IPayment, PaymentStatus } from "@/models/Payment";
import { Order, IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { AuditLog } from "@/models/AuditLog";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors";
import { canTransitionOrder } from "@/lib/order-status";

export interface CreatePaymentParams {
  orderId: string | mongoose.Types.ObjectId;
  orderNumber: string;
  amount: number; // in kopecks
  method?: "card_online" | "cod";
  description?: string;
  returnUrl?: string;
}

export interface PaymentCreationResult {
  paymentId: string;
  externalPaymentId: string;
  amount: number;
  status: PaymentStatus;
  confirmationUrl: string;
}

export interface WebhookPayload {
  eventId: string;
  externalPaymentId: string;
  orderId?: string;
  status: "succeeded" | "failed";
  amount: number;
  timestamp: string | number;
}

export interface PaymentProvider {
  name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentCreationResult>;
  verifyWebhook(rawBody: string, signature: string): boolean;
  generateWebhookSignature(payload: string | object): string;
}

/**
 * Mock payment provider implementation.
 * Simulates an external payment gateway (e.g. YooKassa / Stripe) with HMAC-SHA256 signature verification.
 */
export class MockProvider implements PaymentProvider {
  public readonly name = "mock";
  private secret: string;

  constructor(secret?: string) {
    this.secret =
      secret ||
      process.env.PAYMENT_WEBHOOK_SECRET ||
      "payment_webhook_secret_for_hmac_sha256";
  }

  /**
   * Generates HMAC-SHA256 signature for webhook payload
   */
  public generateWebhookSignature(payload: string | object): string {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    return crypto.createHmac("sha256", this.secret).update(raw).digest("hex");
  }

  /**
   * Verifies incoming webhook HMAC signature using timing-safe comparison
   */
  public verifyWebhook(rawBody: string, signature: string): boolean {
    if (!signature || !rawBody) return false;

    try {
      const expectedSignature = this.generateWebhookSignature(rawBody);
      const signatureBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Creates a mock payment record and returns the mock checkout confirmation URL
   */
  public async createPayment(
    params: CreatePaymentParams
  ): Promise<PaymentCreationResult> {
    await connectToDatabase();

    const externalPaymentId = `pay_${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 16)}`;

    const payment = await Payment.create({
      orderId: new mongoose.Types.ObjectId(params.orderId),
      provider: "mock",
      externalPaymentId,
      method: params.method || "card_online",
      status: "pending",
      amount: params.amount,
      paidAt: null,
    });

    return {
      paymentId: payment._id.toString(),
      externalPaymentId,
      amount: payment.amount,
      status: payment.status,
      confirmationUrl: `/pay/mock/${externalPaymentId}`,
    };
  }
}

export const mockProvider = new MockProvider();

export interface ProcessWebhookResult {
  processed: boolean;
  idempotent: boolean;
  payment: IPayment;
  order: IOrder;
  message: string;
}

/**
 * Validates HMAC signature and processes payment webhook with strict idempotency:
 * - Checks HMAC-SHA256 signature
 * - On success: Payment -> succeeded, Order -> paid, increments Product.salesCount
 * - On failure: Payment -> failed, Order remains new
 * - If already processed with same status: returns idempotent response without double-actions
 */
export async function processPaymentWebhook(
  rawBody: string,
  signature: string,
  ip = ""
): Promise<ProcessWebhookResult> {
  await connectToDatabase();

  // 1. Verify HMAC signature
  const isValidSignature = mockProvider.verifyWebhook(rawBody, signature);
  if (!isValidSignature) {
    throw new UnauthorizedError(
      "Неверная цифровая подпись вебхука",
      "INVALID_SIGNATURE"
    );
  }

  // 2. Parse payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new BadRequestError("Некорректный JSON в теле вебхука", "INVALID_JSON");
  }

  if (!payload.externalPaymentId || !payload.status) {
    throw new BadRequestError(
      "Поля externalPaymentId и status обязательны",
      "MISSING_FIELDS"
    );
  }

  if (payload.status !== "succeeded" && payload.status !== "failed") {
    throw new BadRequestError(
      `Недопустимый статус платежа в вебхуке: ${payload.status}`,
      "INVALID_STATUS"
    );
  }

  // 3. Find payment record
  const payment = await Payment.findOne({
    externalPaymentId: payload.externalPaymentId,
  });

  if (!payment) {
    throw new NotFoundError(
      `Платеж с ID ${payload.externalPaymentId} не найден`,
      "PAYMENT_NOT_FOUND"
    );
  }

  // 4. Find order record
  const order = await Order.findById(payment.orderId);
  if (!order) {
    throw new NotFoundError(
      `Заказ для платежа ${payload.externalPaymentId} не найден`,
      "ORDER_NOT_FOUND"
    );
  }

  // 5. Idempotency checks
  if (payment.status === payload.status) {
    return {
      processed: false,
      idempotent: true,
      payment,
      order,
      message: `Вебхук со статусом ${payload.status} уже был обработан ранее`,
    };
  }

  // If already succeeded, late failed event should not override success
  if (payment.status === "succeeded" && payload.status === "failed") {
    return {
      processed: false,
      idempotent: true,
      payment,
      order,
      message: "Платеж уже успешно завершен, событие отмены проигнорировано",
    };
  }

  // 6. Process status transition
  if (payload.status === "succeeded") {
    payment.status = "succeeded";
    payment.paidAt = new Date();
    await payment.save();

    // Transition order to "paid" if not yet paid
    if (order.status !== "paid") {
      const prevStatus = order.status;
      if (canTransitionOrder(prevStatus, "paid")) {
        order.status = "paid";
        order.statusHistory.push({
          from: prevStatus,
          to: "paid",
          byUserId: null,
          at: new Date(),
        });
        await order.save();
      }

      // Increment salesCount for each product in the order
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { salesCount: item.quantity } }
        ).catch((err) => {
          console.error(
            `Failed to increment salesCount for product ${item.productId}:`,
            err
          );
        });
      }
    }

    // Record audit log
    await AuditLog.create({
      userId: order.userId ? new mongoose.Types.ObjectId(order.userId.toString()) : null,
      action: "payment_succeeded",
      entity: "Payment",
      entityId: payment._id.toString(),
      meta: {
        externalPaymentId: payment.externalPaymentId,
        orderId: order._id.toString(),
        orderNumber: order.number,
        amount: payment.amount,
        eventId: payload.eventId,
      },
      ip,
      at: new Date(),
    }).catch((err) => {
      console.error("Non-fatal: failed to create audit log for payment success:", err);
    });

    return {
      processed: true,
      idempotent: false,
      payment,
      order,
      message: "Оплата успешно подтверждена, заказ переведен в статус «Оплачен»",
    };
  }

  if (payload.status === "failed") {
    payment.status = "failed";
    await payment.save();

    // Order remains in status "new" as per requirements
    // Record audit log
    await AuditLog.create({
      userId: order.userId ? new mongoose.Types.ObjectId(order.userId.toString()) : null,
      action: "payment_failed",
      entity: "Payment",
      entityId: payment._id.toString(),
      meta: {
        externalPaymentId: payment.externalPaymentId,
        orderId: order._id.toString(),
        orderNumber: order.number,
        amount: payment.amount,
        eventId: payload.eventId,
      },
      ip,
      at: new Date(),
    }).catch((err) => {
      console.error("Non-fatal: failed to create audit log for payment failure:", err);
    });

    return {
      processed: true,
      idempotent: false,
      payment,
      order,
      message: "Платеж отклонен, заказ сохранен в статусе «Новый» для повторной оплаты",
    };
  }

  throw new BadRequestError("Непредвиденное состояние вебхука", "WEBHOOK_ERROR");
}

/**
 * Creates a new payment attempt for an existing order in status "new".
 * Useful when previous payment attempt failed or timed out.
 */
export async function retryPaymentOrder(
  orderIdOrNumber: string
): Promise<PaymentCreationResult> {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(orderIdOrNumber);
  const query = isObjectId
    ? { $or: [{ _id: orderIdOrNumber }, { number: orderIdOrNumber }] }
    : { number: orderIdOrNumber };

  const order = await Order.findOne(query);
  if (!order) {
    throw new NotFoundError(
      `Заказ «${orderIdOrNumber}» не найден`,
      "ORDER_NOT_FOUND"
    );
  }

  if (order.status !== "new") {
    throw new ConflictError(
      `Повторная оплата невозможна: заказ находится в статусе «${order.status}»`,
      "ORDER_NOT_PAYABLE"
    );
  }

  return mockProvider.createPayment({
    orderId: order._id,
    orderNumber: order.number,
    amount: order.finalAmount,
    method: "card_online",
  });
}

/**
 * Retrieves payment and associated order details for the mock payment page
 */
export async function getPaymentWithOrder(
  paymentIdOrExternalId: string
): Promise<{ payment: IPayment; order: IOrder } | null> {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(paymentIdOrExternalId);
  const query = isObjectId
    ? {
        $or: [
          { _id: paymentIdOrExternalId },
          { externalPaymentId: paymentIdOrExternalId },
        ],
      }
    : { externalPaymentId: paymentIdOrExternalId };

  const payment = await Payment.findOne(query);
  if (!payment) return null;

  const order = await Order.findById(payment.orderId);
  if (!order) return null;

  return { payment, order };
}
