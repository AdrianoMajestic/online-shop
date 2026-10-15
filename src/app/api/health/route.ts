import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const isDbConnected = mongoose.connection.readyState === 1;

    return NextResponse.json({
      ok: isDbConnected,
      db: isDbConnected,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Database connection error";
    return NextResponse.json(
      {
        ok: false,
        db: false,
        error: errorMessage,
      },
      { status: 503 }
    );
  }
}
