import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { getAdminUsers } from "@/services/admin-directory.service";
import { adminUsersQuerySchema } from "@/lib/validations/admin-directory";

/**
 * GET /api/admin/users
 * Returns paginated list of users with search, role and ban filters (Admin only, Req 44)
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const url = new URL(req.url);
    const query = adminUsersQuerySchema.parse({
      q: url.searchParams.get("q") || undefined,
      role: url.searchParams.get("role") || undefined,
      status: url.searchParams.get("status") || undefined,
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
    });

    const result = await getAdminUsers(query);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
