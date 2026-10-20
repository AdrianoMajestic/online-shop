import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPaymentWithOrder } from "@/services/payment.service";
import MockPaymentClient from "./MockPaymentClient";

export const metadata: Metadata = {
  title: "Тестовая оплата заказа — Кабачок",
  description: "Симулятор эквайринга для безопасного тестирования оплаты",
};

interface PageProps {
  params: {
    paymentId: string;
  };
}

export default async function MockPaymentPage({ params }: PageProps) {
  const data = await getPaymentWithOrder(params.paymentId);

  if (!data) {
    notFound();
  }

  const { payment, order } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <MockPaymentClient
        payment={{
          id: payment._id.toString(),
          externalPaymentId: payment.externalPaymentId,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
        }}
        order={{
          id: order._id.toString(),
          number: order.number,
          status: order.status,
          contactName: order.contact.fullName,
          email: order.contact.email,
          itemCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
        }}
      />
    </div>
  );
}
