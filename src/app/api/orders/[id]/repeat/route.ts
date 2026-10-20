import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { repeatUserOrder } from "@/services/account.service";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/orders/[id]/repeat
 * Adds available items from a previous order into current user cart
 * Checks catalog publication status and stock quantity.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const result = await repeatUserOrder(params.id, sessionData.user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
