import { requireAuth } from "@/lib/rbac";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side session verification
  await requireAuth({ redirectTo: "/account" });

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  );
}
