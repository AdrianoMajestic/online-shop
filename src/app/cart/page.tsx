import type { Metadata } from "next";
import { getProducts } from "@/services/catalog.service";
import { serializeProduct } from "@/lib/formatters";
import { CartContent } from "@/components/CartContent";

export const metadata: Metadata = {
  title: "Корзина покупок | Интернет-магазин «Кабачок»",
  description:
    "Проверьте состав заказа, измените количество товаров и перейдите к оформлению покупки в интернет-магазине «Кабачок».",
};

export default async function CartPage() {
  let recommendations: ReturnType<typeof serializeProduct>[] = [];

  try {
    const popularProductsResult = await getProducts({
      sort: "popular",
      limit: 4,
    });
    recommendations = popularProductsResult.items.map(serializeProduct);
  } catch (error) {
    console.error("[CartPage] Ошибка загрузки рекомендаций:", error);
  }

  return <CartContent recommendedProducts={recommendations} />;
}
