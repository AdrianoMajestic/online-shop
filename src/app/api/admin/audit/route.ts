import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError } from "@/lib/errors";
import { getAuditLogs, AuditLogsQuery } from "@/services/audit";

/**
 * GET /api/admin/audit
 * Retrieves paginated audit logs with filtering by action, entity, date range, and search.
 * Strictly protected: Admin only (Req 62).
 */
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(["admin"], req.headers);

    const searchParams = req.nextUrl.searchParams;
    const query: AuditLogsQuery = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20,
      action: searchParams.get("action") || undefined,
      entity: searchParams.get("entity") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      q: searchParams.get("q") || undefined,
    };

    const result = await getAuditLogs(query);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
