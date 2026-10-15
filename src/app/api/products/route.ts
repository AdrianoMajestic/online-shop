import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { getProductsQuerySchema } from "@/lib/validations/catalog";
import { getProducts } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);

    // Collect query params
    const q = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const brandParam = searchParams.getAll("brand");
    const brand = brandParam.length > 0 ? brandParam : (searchParams.get("brand") ?? undefined);
    const priceMin = searchParams.get("priceMin") ?? undefined;
    const priceMax = searchParams.get("priceMax") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;
    const page = searchParams.get("page") ?? undefined;
    const limit = searchParams.get("limit") ?? undefined;

    const validatedQuery = getProductsQuerySchema.parse({
      q,
      category,
      brand,
      priceMin,
      priceMax,
      sort,
      page,
      limit,
    });

    const result = await getProducts(validatedQuery);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
