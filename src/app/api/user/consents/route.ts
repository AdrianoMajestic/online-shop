import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { updateConsentsSchema } from "@/lib/validations/user";
import { updateUserConsents } from "@/services/account.service";

/**
 * PATCH /api/user/consents
 * Updates user consents for 152-FZ personal data processing and marketing emails
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const body = await req.json();
    const validatedData = updateConsentsSchema.parse(body);

    const consents = await updateUserConsents(
      sessionData.user.id,
      validatedData
    );

    return NextResponse.json(
      {
        success: true,
        consents,
        message: "Настройки согласий успешно обновлены",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
