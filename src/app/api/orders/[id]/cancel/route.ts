import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { cancelUserOrder } from "@/services/account.service";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/orders/[id]/cancel
 * Cancels user order strictly in 'new' status (Assumption A-11)
 * Restores product stock quantities and promo code usage (A-06)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const order = await cancelUserOrder(params.id, sessionData.user.id);
    return NextResponse.json(
      {
        success: true,
        order,
        message: "Заказ успешно отменен. Зарезервированные товары возвращены на склад.",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
