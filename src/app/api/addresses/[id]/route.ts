import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { createAddressSchema } from "@/lib/validations/order";
import {
  getUserAddressById,
  updateUserAddress,
  deleteUserAddress,
} from "@/services/account.service";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/addresses/[id]
 * Retrieves address with strict server ownership validation (403/404)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const address = await getUserAddressById(params.id, sessionData.user.id);
    return NextResponse.json({ address }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/addresses/[id]
 * Updates saved address with strict server ownership validation (403/404)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const body = await req.json();
    const validatedData = createAddressSchema.parse(body);

    const address = await updateUserAddress(
      params.id,
      sessionData.user.id,
      validatedData
    );

    return NextResponse.json(
      { success: true, address, message: "Адрес успешно обновлен" },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/addresses/[id]
 * Deletes saved address with strict server ownership validation (403/404)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Необходима авторизация");
    }

    const result = await deleteUserAddress(params.id, sessionData.user.id);
    return NextResponse.json(
      { ...result, message: "Адрес успешно удален" },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
