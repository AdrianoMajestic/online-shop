import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export type Role = "customer" | "manager" | "admin";

/**
 * Retrieves the current session on the server side using request headers.
 */
export async function getSession(reqHeaders?: Headers) {
  const h = reqHeaders || (await headers());
  return auth.api.getSession({ headers: h });
}

/**
 * Server-side session check for Next.js App Router layouts and pages.
 * Redirects to /login if the user is not authenticated.
 */
export async function requireAuth(options?: { redirectTo?: string }) {
  const sessionData = await getSession();
  if (!sessionData?.session || !sessionData?.user) {
    const callbackUrl = options?.redirectTo || "/account";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return sessionData;
}

/**
 * Server-side RBAC check for Next.js App Router layouts and pages.
 * Redirects to /login if unauthenticated, or redirects to /?error=forbidden if role is insufficient.
 */
export async function requireRole(...roles: Role[]) {
  const sessionData = await getSession();
  if (!sessionData?.session || !sessionData?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/admin")}`);
  }
  const userRole = ((sessionData.user as { role?: string }).role ||
    "customer") as Role;
  if (!roles.includes(userRole)) {
    redirect("/?error=forbidden");
  }
  return sessionData;
}

/**
 * API Route Handler helper: ensures user is authenticated, otherwise throws UnauthorizedError.
 */
export async function requireApiAuth(reqHeaders?: Headers) {
  const sessionData = await getSession(reqHeaders);
  if (!sessionData?.session || !sessionData?.user) {
    throw new UnauthorizedError("Необходима авторизация");
  }
  return sessionData;
}

/**
 * API Route Handler helper: ensures user has one of the specified roles, otherwise throws ForbiddenError.
 */
export async function requireApiRole(roles: Role[], reqHeaders?: Headers) {
  const sessionData = await requireApiAuth(reqHeaders);
  const userRole = ((sessionData.user as { role?: string }).role ||
    "customer") as Role;
  if (!roles.includes(userRole)) {
    throw new ForbiddenError("Недостаточно прав доступа");
  }
  return sessionData;
}
