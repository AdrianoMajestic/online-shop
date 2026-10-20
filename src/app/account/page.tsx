import { getSession } from "@/lib/rbac";
import { getUserProfile } from "@/services/account.service";
import { ProfileContent } from "@/components/account/ProfileContent";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sessionData = await getSession();
  const userId = sessionData?.user?.id;

  const profile = userId ? await getUserProfile(userId) : null;

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Не удалось загрузить данные профиля.
      </div>
    );
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
