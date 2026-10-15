import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { getCategoryTree } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const categoriesTree = await getCategoryTree();
    return NextResponse.json(categoriesTree);
  } catch (error) {
    return handleError(error);
  }
}
