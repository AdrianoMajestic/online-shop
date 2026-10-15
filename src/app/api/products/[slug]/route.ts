import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { getProductBySlug } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const product = await getProductBySlug(params.slug);
    return NextResponse.json(product);
  } catch (error) {
    return handleError(error);
  }
}
