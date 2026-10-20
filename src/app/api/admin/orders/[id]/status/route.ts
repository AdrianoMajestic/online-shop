import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { updateOrderStatusSchema } from "@/lib/validations/admin-order";
import {
  updateAdminOrderStatus,
  StaffUser,
} from "@/services/admin-order.service";
import { getClientIp } from "@/services/audit";

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/admin/orders/[id]/status
 * Updates order status according to transition rules (A-05), restores stock on cancellation (A-06),
 * logs notification (A-18), records in statusHistory, and records AuditLog.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const staffUser = sessionData.user as StaffUser;

    const body = await req.json();
    const validatedData = updateOrderStatusSchema.parse(body);

    const clientIp = getClientIp(req);
    const updatedOrder = await updateAdminOrderStatus(
      params.id,
      validatedData.status,
      staffUser,
      validatedData.comment,
      { ip: clientIp }
    );

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
