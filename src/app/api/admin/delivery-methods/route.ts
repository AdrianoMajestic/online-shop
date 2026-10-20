import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminDeliveryMethodsList,
  createAdminDeliveryMethod,
} from "@/services/admin-directory.service";
import { adminDeliveryMethodCreateSchema } from "@/lib/validations/admin-directory";

/**
 * GET /api/admin/delivery-methods
 * Lists all delivery methods (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);
    const methods = await getAdminDeliveryMethodsList();
    return NextResponse.json({ methods }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/admin/delivery-methods
 * Creates a new delivery method (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminDeliveryMethodCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации данных способа доставки",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const method = await createAdminDeliveryMethod(parsed.data);
    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
