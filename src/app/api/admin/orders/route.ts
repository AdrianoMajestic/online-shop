import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { adminOrdersQuerySchema } from "@/lib/validations/admin-order";
import { getAdminOrders } from "@/services/admin-order.service";

/**
 * GET /api/admin/orders
 * Returns paginated orders list with status, date range, and text search filters.
 * Accessible to both admin and manager (A-09).
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin", "manager"], req.headers);

    const url = new URL(req.url);
    const rawQuery = {
      status: url.searchParams.get("status") || "all",
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      q: url.searchParams.get("q") || undefined,
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
    };

    const validatedQuery = adminOrdersQuerySchema.parse(rawQuery);
    const result = await getAdminOrders(validatedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
