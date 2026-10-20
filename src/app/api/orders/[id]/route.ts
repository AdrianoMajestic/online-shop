import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getUserOrderById } from "@/services/account.service";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/orders/[id]
 * Retrieves detailed order information with strict ownership check (403/404)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const order = await getUserOrderById(params.id, sessionData.user.id);
    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
