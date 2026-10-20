import { requireAuth, getSession } from "@/lib/rbac";
import { getUserProfile } from "@/services/account.service";
import { ConsentsContent } from "@/components/account/ConsentsContent";

export const dynamic = "force-dynamic";

export default async function AccountConsentsPage() {
  await requireAuth({ redirectTo: "/account/consents" });
  const sessionData = await getSession();
  const userId = sessionData!.user.id;

  const profile = await getUserProfile(userId);
  const plainConsents = JSON.parse(JSON.stringify(profile.consents || {}));

  return <ConsentsContent initialConsents={plainConsents} />;
}
