import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { getProductsQuerySchema } from "@/lib/validations/catalog";
import { getProducts } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;

    // Collect query params
    const q = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") || searchParams.get("categoryId") || undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;

    const brandParams = [
      ...searchParams.getAll("brand"),
      ...searchParams.getAll("brandId"),
    ];
    const brand = brandParams.length > 0 ? brandParams : (searchParams.get("brand") || searchParams.get("brandId") || undefined);
    const brandId = searchParams.get("brandId") ?? undefined;

    const priceMin = searchParams.get("priceMin") ?? undefined;
    const priceMax = searchParams.get("priceMax") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;
    const order = searchParams.get("order") ?? undefined;
    const page = searchParams.get("page") ?? undefined;
    const limit = searchParams.get("limit") ?? undefined;

    const validatedQuery = getProductsQuerySchema.parse({
      q,
      category,
      categoryId,
      brand,
      brandId,
      priceMin,
      priceMax,
      sort,
      order,
      page,
      limit,
    });

    const result = await getProducts(validatedQuery);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
