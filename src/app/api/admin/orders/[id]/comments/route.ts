import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { addManagerCommentSchema } from "@/lib/validations/admin-order";
import {
  addAdminOrderComment,
  StaffUser,
} from "@/services/admin-order.service";

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/orders/[id]/comments
 * Appends an internal manager comment to the order.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const staffUser = sessionData.user as StaffUser;

    const body = await req.json();
    const validatedData = addManagerCommentSchema.parse(body);

    const updatedOrder = await addAdminOrderComment(
      params.id,
      validatedData.text,
      staffUser
    );

    return NextResponse.json({ order: updatedOrder }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
