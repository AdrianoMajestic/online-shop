import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminPromoCodeById,
  updateAdminPromoCode,
  deleteAdminPromoCode,
} from "@/services/admin-directory.service";
import { adminPromoCodeUpdateSchema } from "@/lib/validations/admin-directory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireApiRole(["admin"], req.headers);
    const { id } = await params;

    const promoCode = await getAdminPromoCodeById(id);
    return NextResponse.json({ promoCode }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireApiRole(["admin"], req.headers);
    const { id } = await params;

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminPromoCodeUpdateSchema.safeParse(body);
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

    const promoCode = await updateAdminPromoCode(id, parsed.data);
    return NextResponse.json({ promoCode }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireApiRole(["admin"], req.headers);
    const { id } = await params;

    const result = await deleteAdminPromoCode(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
