import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminPromoCodesList,
  createAdminPromoCode,
} from "@/services/admin-directory.service";
import { adminPromoCodeCreateSchema } from "@/lib/validations/admin-directory";

/**
 * GET /api/admin/promocodes
 * Lists all promo codes (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);
    const promoCodes = await getAdminPromoCodesList();
    return NextResponse.json({ promoCodes }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/admin/promocodes
 * Creates a new promo code (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminPromoCodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации данных промокода",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const promoCode = await createAdminPromoCode(parsed.data);
    return NextResponse.json({ promoCode }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
