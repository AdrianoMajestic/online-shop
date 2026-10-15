import { requireRole } from "@/lib/rbac";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side check: only admin and manager roles are permitted
  await requireRole("admin", "manager");

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  );
}
