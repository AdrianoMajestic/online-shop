import { NextRequest, NextResponse } from "next/server";
import { retryPaymentOrder } from "@/services/payment.service";
import { handleError, BadRequestError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderRef = body.orderNumber || body.orderId;

    if (!orderRef) {
      throw new BadRequestError(
        "Параметр orderNumber или orderId обязателен",
        "MISSING_ORDER_REF"
      );
    }

    const result = await retryPaymentOrder(orderRef);

    return NextResponse.json(
      {
        ok: true,
        payment: result,
        confirmationUrl: result.confirmationUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
