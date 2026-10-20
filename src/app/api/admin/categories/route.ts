import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminCategories,
  StaffUser,
} from "@/services/admin-product.service";
import {
  getAdminCategoriesList,
  createAdminCategory,
} from "@/services/admin-directory.service";
import { adminCategoryCreateSchema } from "@/lib/validations/admin-directory";

/**
 * GET /api/admin/categories
 * If query param ?view=admin or role is admin, returns the complete list of categories with details.
 * If accessed by manager, returns assigned categories list for products form.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;
    const url = new URL(req.url);
    const viewAdmin = url.searchParams.get("view") === "admin";

    if (user.role === "admin" && viewAdmin) {
      const categories = await getAdminCategoriesList();
      return NextResponse.json({ categories }, { status: 200 });
    }

    const categories = await getAdminCategories(user);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/admin/categories
 * Creates a new category (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminCategoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации данных категории",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const category = await createAdminCategory(parsed.data);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
