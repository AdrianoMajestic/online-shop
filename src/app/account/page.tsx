import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { getUserProfile, UserProfileData } from "@/services/account.service";
import { ProfileContent } from "@/components/account/ProfileContent";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sessionData = await getSession();
  const userId = sessionData?.user?.id;

  if (!userId) {
    redirect("/login?reason=session_expired");
  }

  let profile: UserProfileData | null = null;
  try {
    profile = await getUserProfile(userId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect("/login?reason=session_expired");
    }
    throw error;
  }

  if (!profile) {
    redirect("/login?reason=session_expired");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Профиль и безопасность
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Управление вашими контактными данными и параметрами входа
        </p>
      </div>

      <ProfileContent initialUser={profile} />
    </div>
  );
}
