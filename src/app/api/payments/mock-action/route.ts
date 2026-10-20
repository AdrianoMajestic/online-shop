import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getPaymentWithOrder,
  mockProvider,
  processPaymentWebhook,
} from "@/services/payment.service";
import { handleError, BadRequestError, NotFoundError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { paymentId, status } = body;

    if (!paymentId || (status !== "succeeded" && status !== "failed")) {
      throw new BadRequestError(
        "Параметры paymentId и status ('succeeded' | 'failed') обязательны",
        "INVALID_REQUEST"
      );
    }

    const data = await getPaymentWithOrder(paymentId);
    if (!data) {
      throw new NotFoundError("Данные платежа не найдены", "PAYMENT_NOT_FOUND");
    }

    const payload = {
      eventId: `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      externalPaymentId: data.payment.externalPaymentId,
      orderId: data.order._id.toString(),
      status,
      amount: data.payment.amount,
      timestamp: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(payload);
    const signature = mockProvider.generateWebhookSignature(rawBody);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await processPaymentWebhook(rawBody, signature, ip);

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      idempotent: result.idempotent,
      message: result.message,
      status: result.payment.status,
      orderNumber: result.order.number,
      redirectUrl: `/orders/${result.order.number}/success`,
    });
  } catch (error) {
    return handleError(error);
  }
}
