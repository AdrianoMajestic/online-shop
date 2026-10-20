import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { changePasswordSchema } from "@/lib/validations/user";
import { changeUserPassword } from "@/services/account.service";

/**
 * POST /api/user/change-password
 * Safely changes user password with complex validation and Better Auth encryption
 */
export async function POST(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const body = await req.json();
    const validatedData = changePasswordSchema.parse(body);

    const result = await changeUserPassword(
      sessionData.user.id,
      validatedData,
      req.headers
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
