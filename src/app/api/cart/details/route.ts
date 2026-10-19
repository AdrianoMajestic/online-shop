import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { cartDetailsSchema } from "@/lib/validations/cart";
import { enrichGuestCart } from "@/services/cart.service";

/**
 * POST /api/cart/details
 * Enriches guest items from localStorage with fresh DB prices, stock availability and subtotals.
 * Accessible without authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = cartDetailsSchema.parse(body);

    const cart = await enrichGuestCart(validatedData.items);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
