import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import { updateAdminUserRole } from "@/services/admin-directory.service";
import { adminUpdateUserRoleSchema } from "@/lib/validations/admin-directory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id]/role
 * Changes user role (customer | manager | admin).
 * Protected: Admin cannot remove admin role from themselves! (Req 45)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await requireApiRole(["admin"], req.headers);
    const currentAdmin = sessionData.user as { id?: string; _id?: string; email?: string };
    const currentAdminId = currentAdmin.id || currentAdmin._id?.toString() || "";
    const currentAdminEmail = currentAdmin.email;

    const { id } = await params;

    const body = await req.json().catch(() => {
      throw new BadRequestError("Невалидное тело JSON-запроса");
    });

    const parsed = adminUpdateUserRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации роли",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await updateAdminUserRole({
      currentAdminId,
      currentAdminEmail,
      targetUserId: id,
      newRole: parsed.data.role,
    });

    return NextResponse.json({ success: true, user: result }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
