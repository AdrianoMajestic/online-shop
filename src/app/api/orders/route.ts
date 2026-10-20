import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { createOrderSchema } from "@/lib/validations/order";
import { createOrder } from "@/services/order.service";

import { getUserOrders } from "@/services/account.service";

/**
 * GET /api/orders
 * Retrieves all orders for the authenticated user with optional status filter
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Необходима авторизация" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const orders = await getUserOrders(sessionData.user.id, status);
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/orders
 * Creates an order (supports both authenticated users and guest checkout)
 * Executes atomically with MongoDB transaction or compensation rollback.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Check optional user session
    const sessionData = await auth.api.getSession({ headers: req.headers });
    const userId = sessionData?.user?.id ?? null;

    // 2. Validate request payload with Zod
    const body = await req.json();
    const validatedData = createOrderSchema.parse(body);

    // 3. Create order in order service
    const { order, payment } = await createOrder(validatedData, userId);

    return NextResponse.json(
      {
        order,
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
