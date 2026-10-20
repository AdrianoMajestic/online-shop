import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import {
  getAdminCategories,
  StaffUser,
} from "@/services/admin-product.service";

/**
 * GET /api/admin/categories
 * Returns categories accessible to the current staff user (filtered for manager, all for admin)
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;

    const categories = await getAdminCategories(user);

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
