import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { cartDetailsSchema } from "@/lib/validations/cart";
import { mergeGuestCart } from "@/services/cart.service";

/**
 * POST /api/cart/merge
 * Explicit endpoint to merge guest cart items into authenticated user's DB cart.
 * Quantities are summed, but capped at physical stockQuantity.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionData = await requireApiAuth(req.headers);
    const userId = sessionData.user.id;

    const body = await req.json();
    const validatedData = cartDetailsSchema.parse(body);

    const cart = await mergeGuestCart(userId, validatedData.items);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
