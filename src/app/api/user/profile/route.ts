import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  formatErrorResponse,
  handleError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors";
import { updateProfileSchema } from "@/lib/validations/user";
import {
  getUserProfile,
  updateUserProfile,
} from "@/services/account.service";

/**
 * Helper to invalidate Better Auth session cookies on expired/missing user
 */
function invalidateSessionResponse(): NextResponse {
  const response = NextResponse.json(
    formatErrorResponse("UNAUTHORIZED", "Сессия недействительна или пользователь не найден"),
    { status: 401 }
  );
  response.cookies.delete("better-auth.session_token");
  response.cookies.delete("__Secure-better-auth.session_token");
  return response;
}

/**
 * GET /api/user/profile
 * Retrieves profile information for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    try {
      const profile = await getUserProfile(sessionData.user.id);
      return NextResponse.json({ profile }, { status: 200 });
    } catch (profileError) {
      if (profileError instanceof NotFoundError) {
        return invalidateSessionResponse();
      }
      throw profileError;
    }
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/user/profile
 * Updates editable profile information (name, phone)
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const body = await req.json();
    const validatedData = updateProfileSchema.parse(body);

    try {
      const updated = await updateUserProfile(sessionData.user.id, validatedData);
      return NextResponse.json(
        { success: true, user: updated, message: "Данные профиля успешно сохранены" },
        { status: 200 }
      );
    } catch (profileError) {
      if (profileError instanceof NotFoundError) {
        return invalidateSessionResponse();
      }
      throw profileError;
    }
  } catch (error) {
    return handleError(error);
  }
}
