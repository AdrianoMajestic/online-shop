import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { getAdminBrands } from "@/services/admin-product.service";

/**
 * GET /api/admin/brands
 * Returns all brands for admin selection
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin", "manager"], req.headers);
    const brands = await getAdminBrands();

    return NextResponse.json({ brands }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
