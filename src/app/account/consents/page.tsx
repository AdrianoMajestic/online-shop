import { redirect } from "next/navigation";
import { requireAuth, getSession } from "@/lib/rbac";
import { getUserProfile } from "@/services/account.service";
import { ConsentsContent } from "@/components/account/ConsentsContent";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AccountConsentsPage() {
  await requireAuth({ redirectTo: "/account/consents" });
  const sessionData = await getSession();
  const userId = sessionData?.user?.id;

  if (!userId) {
    redirect("/login?reason=session_expired");
  }

  let profile;
  try {
    profile = await getUserProfile(userId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect("/login?reason=session_expired");
    }
    throw error;
  }

  const plainConsents = JSON.parse(JSON.stringify(profile.consents || {}));

  return <ConsentsContent initialConsents={plainConsents} />;
}
