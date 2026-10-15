import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
  const response = await handlers.POST(request);

  // Unified Russian message for login error: «Неверный логин или пароль»
  if (response.status === 401) {
    try {
      const cloned = response.clone();
      const body = (await cloned.json()) as { code?: string; message?: string };
      if (body.code === "INVALID_EMAIL_OR_PASSWORD") {
        return Response.json(
          {
            code: "INVALID_EMAIL_OR_PASSWORD",
            message: "Неверный логин или пароль",
          },
          {
            status: 401,
            headers: response.headers,
          }
        );
      }
    } catch {
      // Ignore if response body cannot be parsed
    }
  }

  return response;
}
