import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { getAdminOrderById } from "@/services/admin-order.service";

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/orders/[id]
 * Retrieves complete order details and associated payments for staff.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    await requireApiRole(["admin", "manager"], req.headers);

    const result = await getAdminOrderById(params.id);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
