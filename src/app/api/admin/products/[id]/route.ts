import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/rbac";
import { handleError, BadRequestError } from "@/lib/errors";
import {
  adminProductUpdateSchema,
  adminProductPatchSchema,
} from "@/lib/validations/admin-product";
import {
  getAdminProductById,
  updateAdminProduct,
  deactivateAdminProduct,
  togglePublishAdminProduct,
  StaffUser,
} from "@/services/admin-product.service";

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/products/[id]
 * Retrieves product details with category RBAC check
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;

    const product = await getAdminProductById(params.id, user);

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/admin/products/[id]
 * Updates product details with category RBAC check
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;

    const body = await req.json();
    const validatedData = adminProductUpdateSchema.parse(body);

    const product = await updateAdminProduct(params.id, validatedData, user);

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/products/[id]
 * Quick product mutations: deactivation, status toggle, price, or stock changes
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const sessionData = await requireApiRole(["admin", "manager"], req.headers);
    const user = sessionData.user as StaffUser;

    const body = await req.json();
    const validatedPatch = adminProductPatchSchema.parse(body);

    if (validatedPatch.action === "deactivate" || validatedPatch.isPublished === false) {
      const product = await deactivateAdminProduct(params.id, user);
      return NextResponse.json({ product }, { status: 200 });
    }

    if (validatedPatch.action === "toggle_publish") {
      const product = await togglePublishAdminProduct(params.id, user);
      return NextResponse.json({ product }, { status: 200 });
    }

    if (validatedPatch.action === "activate" || validatedPatch.isPublished === true) {
      const product = await updateAdminProduct(params.id, { isPublished: true }, user);
      return NextResponse.json({ product }, { status: 200 });
    }

    if (validatedPatch.stockQuantity !== undefined) {
      const product = await updateAdminProduct(
        params.id,
        { stockQuantity: validatedPatch.stockQuantity },
        user
      );
      return NextResponse.json({ product }, { status: 200 });
    }

    if (validatedPatch.price !== undefined) {
      const product = await updateAdminProduct(
        params.id,
        { price: validatedPatch.price },
        user
      );
      return NextResponse.json({ product }, { status: 200 });
    }

    throw new BadRequestError("Не указано допустимое действие для обновления товара");
  } catch (error) {
    return handleError(error);
  }
}
