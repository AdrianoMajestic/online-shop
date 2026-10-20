import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  getAdminBrandById,
  updateAdminBrand,
  deleteAdminBrand,
} from "@/services/admin-directory.service";
import { adminBrandUpdateSchema } from "@/lib/validations/admin-directory";
import { getClientIp } from "@/services/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireApiRole(["admin"], req.headers);
    const { id } = await params;

    const brand = await getAdminBrandById(id);
    return NextResponse.json({ brand }, { status: 200 });
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

    const parsed = adminBrandUpdateSchema.safeParse(body);
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

    const brand = await updateAdminBrand(id, parsed.data);
    return NextResponse.json({ brand }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await requireApiRole(["admin"], req.headers);
    const clientIp = getClientIp(req);
    const { id } = await params;

    const result = await deleteAdminBrand(id, {
      userId: sessionData.user.id,
      ip: clientIp,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
