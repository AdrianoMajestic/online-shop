import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import { assignManagerCategories } from "@/services/admin-directory.service";
import { adminAssignManagerCategoriesSchema } from "@/lib/validations/admin-directory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id]/categories
 * Assigns manageable categories to a manager (Req 45)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireApiRole(["admin"], req.headers);
    const { id } = await params;

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminAssignManagerCategoriesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации списка категорий",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await assignManagerCategories({
      targetUserId: id,
      assignedCategoryIds: parsed.data.assignedCategoryIds,
    });

    return NextResponse.json({ success: true, user: result }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
