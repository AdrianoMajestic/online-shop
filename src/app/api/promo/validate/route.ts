import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { validatePromoSchema } from "@/lib/validations/order";
import { validatePromoCodeService } from "@/services/order.service";

/**
 * POST /api/promo/validate
 * Validates promo code against database and calculates applicable discount
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = validatePromoSchema.parse(body);

    const result = await validatePromoCodeService(validatedData);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
