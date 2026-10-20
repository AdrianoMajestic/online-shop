import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import { toggleAdminUserBan } from "@/services/admin-directory.service";
import { adminToggleUserBanSchema } from "@/lib/validations/admin-directory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id]/ban
 * Bans or unbans a user.
 * Protected: Admin cannot ban themselves! (Req 44)
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

    const parsed = adminToggleUserBanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ошибка валидации параметров блокировки",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await toggleAdminUserBan({
      currentAdminId,
      currentAdminEmail,
      targetUserId: id,
      banned: parsed.data.banned,
      banReason: parsed.data.banReason,
    });

    return NextResponse.json({ success: true, user: result }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
