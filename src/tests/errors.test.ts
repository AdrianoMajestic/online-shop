import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorResponse,
} from "@/lib/errors";

describe("Error handling and formatting (lib/errors)", () => {
  it("creates standard AppError with status and code", () => {
    const error = new AppError("Тестовая ошибка", 418, "TEAPOT", { foo: "bar" });
    expect(error.message).toBe("Тестовая ошибка");
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe("TEAPOT");
    expect(error.details).toEqual({ foo: "bar" });
  });

  it("creates ValidationError with 400 status and VALIDATION_ERROR code", () => {
    const error = new ValidationError("Некорректный email", { field: "email" });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Некорректный email");
  });

  it("creates NotFoundError with 404 status and NOT_FOUND code", () => {
    const error = new NotFoundError("Товар не найден");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("correctly formats error response JSON structure according to AGENT_SPEC", () => {
    const formatted = formatErrorResponse("OUT_OF_STOCK", "Недостаточно товара", {
      available: 2,
      requested: 5,
    });

    expect(formatted).toEqual({
      error: {
        code: "OUT_OF_STOCK",
        message: "Недостаточно товара",
        details: {
          available: 2,
          requested: 5,
        },
      },
    });
  });
});
