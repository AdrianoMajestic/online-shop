import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import { getAdminBrands } from "@/services/admin-product.service";
import {
  getAdminBrandsList,
  createAdminBrand,
} from "@/services/admin-directory.service";
import { adminBrandCreateSchema } from "@/lib/validations/admin-directory";

/**
 * GET /api/admin/brands
 * Returns brands list (full admin details if view=admin, or quick list for product selector)
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const userRole = (sessionData.user as { role?: string }).role;
    const url = new URL(req.url);
    const viewAdmin = url.searchParams.get("view") === "admin";

    if (userRole === "admin" && viewAdmin) {
      const brands = await getAdminBrandsList();
      return NextResponse.json({ brands }, { status: 200 });
    }

    const brands = await getAdminBrands();
    return NextResponse.json({ brands }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/admin/brands
 * Creates a new brand (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminBrandCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации данных бренда",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const brand = await createAdminBrand(parsed.data);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
