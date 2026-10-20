import { Metadata } from "next";
import { getActiveDeliveryMethods } from "@/services/order.service";
import { CheckoutContent, DeliveryMethodDto } from "@/components/CheckoutContent";

export const metadata: Metadata = {
  title: "Оформление заказа — Интернет-магазин «Кабачок»",
  description: "Безопасное оформление заказа с доставкой по всей России в магазине техники «Кабачок».",
};

export default async function CheckoutPage() {
  const deliveryMethods = await getActiveDeliveryMethods();

  const serializedDeliveryMethods: DeliveryMethodDto[] = deliveryMethods.map((m) => ({
    _id: m._id.toString(),
    code: m.code,
    title: m.title,
    price: m.price,
    description: m.description,
    isActive: m.isActive,
  }));

  return <CheckoutContent initialDeliveryMethods={serializedDeliveryMethods} />;
}
