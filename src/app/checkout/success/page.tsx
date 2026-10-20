import { redirect } from "next/navigation";

interface CheckoutSuccessPageProps {
  searchParams: {
    orderNumber?: string;
    orderId?: string;
  };
}

export default function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const target = searchParams.orderNumber || searchParams.orderId;
  if (target) {
    redirect(`/orders/${target}/success`);
  }
  redirect("/catalog");
}
