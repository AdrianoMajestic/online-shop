import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { audit, getClientIp } from "@/services/audit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
  const response = await handlers.POST(request);

  // 1. Audit log on successful login (T12)
  if (response.status === 200) {
    try {
      const url = new URL(request.url);
      if (url.pathname.includes("/sign-in")) {
        const cloned = response.clone();
        const data = (await cloned.json()) as {
          user?: { id?: string; email?: string; name?: string; role?: string };
        };
        if (data?.user?.id) {
          const clientIp = getClientIp(request);
          audit(
            "user.login",
            "User",
            data.user.id,
            {
              email: data.user.email,
              name: data.user.name,
              role: data.user.role || "customer",
            },
            {
              userId: data.user.id,
              ip: clientIp,
              userEmail: data.user.email,
              userName: data.user.name,
            }
          ).catch((err) => {
            console.error("[Audit Error on login]", err);
          });
        }
      }
    } catch {
      // Ignore if response body cannot be parsed
    }
  }

  // 2. Unified Russian message for login error: «Неверный логин или пароль»
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
