import { requireAuth, getSession } from "@/lib/rbac";
import { getUserAddresses } from "@/services/account.service";
import { AddressesContent } from "@/components/account/AddressesContent";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage() {
  await requireAuth({ redirectTo: "/account/addresses" });
  const sessionData = await getSession();
  const userId = sessionData!.user.id;

  const addresses = await getUserAddresses(userId);
  const plainAddresses = JSON.parse(JSON.stringify(addresses));

  return <AddressesContent initialAddresses={plainAddresses} />;
}
