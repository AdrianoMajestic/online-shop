import { NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { getActiveDeliveryMethods } from "@/services/order.service";

/**
 * GET /api/delivery-methods
 * Returns list of active delivery methods sorted by price ascending
 */
export async function GET() {
  try {
    const deliveryMethods = await getActiveDeliveryMethods();
    return NextResponse.json(
      { deliveryMethods, items: deliveryMethods },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
