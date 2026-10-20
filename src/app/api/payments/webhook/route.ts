import { NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/services/payment.service";
import { handleError, UnauthorizedError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const signature =
      req.headers.get("x-payment-signature") ||
      req.headers.get("x-signature") ||
      "";

    if (!signature) {
      throw new UnauthorizedError(
        "Заголовок цифровой подписи (x-payment-signature) отсутствует",
        "MISSING_SIGNATURE"
      );
    }

    const rawBody = await req.text();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    const result = await processPaymentWebhook(rawBody, signature, ip);

    return NextResponse.json(
      {
        ok: true,
        processed: result.processed,
        idempotent: result.idempotent,
        message: result.message,
        payment: {
          id: result.payment._id,
          externalPaymentId: result.payment.externalPaymentId,
          status: result.payment.status,
          amount: result.payment.amount,
        },
        order: {
          id: result.order._id,
          number: result.order.number,
          status: result.order.status,
          finalAmount: result.order.finalAmount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
