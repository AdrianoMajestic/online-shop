import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminPaymentMethods,
  updateAdminPaymentMethod,
} from "@/services/admin-directory.service";
import { z } from "zod";

const updatePaymentMethodSchema = z.object({
  code: z.enum(["card_online", "cod"], {
    errorMap: () => ({ message: "Способ оплаты должен быть card_online или cod" }),
  }),
  isActive: z.boolean(),
});

/**
 * GET /api/admin/payment-methods
 * Lists payment methods with active status (Admin only, Req 50)
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);
    const methods = await getAdminPaymentMethods();
    return NextResponse.json({ methods }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/payment-methods
 * Enables or disables payment method (Admin only, Req 50)
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = updatePaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации параметров способа оплаты",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateAdminPaymentMethod(parsed.data.code, parsed.data.isActive);
    return NextResponse.json({ method: updated }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
