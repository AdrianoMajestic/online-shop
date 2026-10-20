import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminCategoryById,
  updateAdminCategory,
  deleteAdminCategory,
} from "@/services/admin-directory.service";
import { adminCategoryUpdateSchema } from "@/lib/validations/admin-directory";
import { getClientIp } from "@/services/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireApiRole(["admin"], req.headers);
    const { id } = await params;

    const category = await getAdminCategoryById(id);
    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await requireApiRole(["admin"], req.headers);
    const clientIp = getClientIp(req);
    const { id } = await params;

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminCategoryUpdateSchema.safeParse(body);
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

    const category = await updateAdminCategory(id, parsed.data, {
      userId: sessionData.user.id,
      ip: clientIp,
    });
    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await requireApiRole(["admin"], req.headers);
    const clientIp = getClientIp(req);
    const { id } = await params;

    const result = await deleteAdminCategory(id, {
      userId: sessionData.user.id,
      ip: clientIp,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
