import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { createAddressSchema } from "@/lib/validations/order";
import {
  getUserSavedAddresses,
  saveUserAddress,
} from "@/services/order.service";

/**
 * GET /api/addresses
 * Returns saved addresses for the authenticated user, or empty list for guests
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      return NextResponse.json({ addresses: [] }, { status: 200 });
    }

    const addresses = await getUserSavedAddresses(sessionData.user.id);
    return NextResponse.json({ addresses }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/addresses
 * Saves a new delivery address for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    if (!sessionData?.user) {
      throw new UnauthorizedError("Для сохранения адреса необходима авторизация");
    }

    const body = await req.json();
    const validatedData = createAddressSchema.parse(body);

    const address = await saveUserAddress(sessionData.user.id, validatedData);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
