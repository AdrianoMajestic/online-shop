import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Неверный запрос", code = "BAD_REQUEST", details?: unknown) {
    super(message, 400, code, details);
    this.name = "BadRequestError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Ошибка валидации данных", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Требуется авторизация", code = "UNAUTHORIZED") {
    super(message, 401, code);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Доступ запрещен", code = "FORBIDDEN") {
    super(message, 403, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ресурс не найден", code = "NOT_FOUND") {
    super(message, 404, code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Конфликт данных", code = "CONFLICT", details?: unknown) {
    super(message, 409, code, details);
    this.name = "ConflictError";
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Внутренняя ошибка сервера", code = "INTERNAL_ERROR") {
    super(message, 500, code);
    this.name = "InternalServerError";
  }
}

export function formatErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ZodError) {
    console.error("[API Error] Validation failed:", error.message);
  } else if (error instanceof Error) {
    console.error(`[API Error] ${error.name}:`, error.message);
  } else {
    console.error("[API Error]:", error);
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      formatErrorResponse(error.code, error.message, error.details),
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const formattedDetails = error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return NextResponse.json(
      formatErrorResponse("VALIDATION_ERROR", "Ошибка валидации данных", formattedDetails),
      { status: 400 }
    );
  }

  // Fallback for unexpected errors
  const fallbackMessage =
    error instanceof Error ? error.message : "Произошла непредвиденная ошибка на сервере";

  return NextResponse.json(
    formatErrorResponse("INTERNAL_ERROR", "Внутренняя ошибка сервера", {
      reason: process.env.NODE_ENV === "development" ? fallbackMessage : undefined,
    }),
    { status: 500 }
  );
}
