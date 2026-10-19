import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { updateCartSchema } from "@/lib/validations/cart";
import {
  getEnrichedCart,
  updateUserCart,
  mergeGuestCart,
  clearUserCart,
} from "@/services/cart.service";

/**
 * GET /api/cart
 * Returns the authenticated user's cart enriched with fresh prices, stocks and totals
 */
export async function GET(req: NextRequest) {
  try {
    const sessionData = await requireApiAuth(req.headers);
    const userId = sessionData.user.id;

    const cart = await getEnrichedCart(userId);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/cart
 * Updates user's cart in DB with server-side stock validation or merges items if merge: true
 */
export async function PUT(req: NextRequest) {
  try {
    const sessionData = await requireApiAuth(req.headers);
    const userId = sessionData.user.id;

    const body = await req.json();
    const validatedData = updateCartSchema.parse(body);

    const cart = validatedData.merge
      ? await mergeGuestCart(userId, validatedData.items)
      : await updateUserCart(userId, validatedData.items);

    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/cart
 * Clears all items from the authenticated user's cart in DB
 */
export async function DELETE(req: NextRequest) {
  try {
    const sessionData = await requireApiAuth(req.headers);
    const userId = sessionData.user.id;

    const cart = await clearUserCart(userId);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
