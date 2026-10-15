import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";
import * as dbModule from "@/lib/db";
import mongoose from "mongoose";

describe("Health API Route (/api/health)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok: true, db: true when database is connected", async () => {
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 1,
      configurable: true,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, db: true });
  });

  it("returns ok: false, db: false with 503 when connection fails", async () => {
    vi.spyOn(dbModule, "connectToDatabase").mockRejectedValue(
      new Error("Database connection refused")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.db).toBe(false);
    expect(data.error).toBe("Database connection refused");
  });
});
