import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import {
  adminProductsQuerySchema,
  adminProductCreateSchema,
} from "@/lib/validations/admin-product";
import {
  getAdminProducts,
  createAdminProduct,
  StaffUser,
} from "@/services/admin-product.service";

/**
 * GET /api/admin/products
 * Returns a paginated list of products for manager or admin with category RBAC
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;

    const url = new URL(req.url);
    const rawQuery = {
      q: url.searchParams.get("q") || undefined,
      categoryId: url.searchParams.get("categoryId") || undefined,
      brandId: url.searchParams.get("brandId") || undefined,
      isPublished: url.searchParams.get("isPublished") || "all",
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
    };

    const validatedQuery = adminProductsQuerySchema.parse(rawQuery);
    const result = await getAdminProducts(user, validatedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/admin/products
 * Creates a new product, ensuring manager only creates in assigned categories
 */
export async function POST(req: NextRequest) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;

    const body = await req.json();
    const validatedData = adminProductCreateSchema.parse(body);

    const product = await createAdminProduct(validatedData, user);

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
