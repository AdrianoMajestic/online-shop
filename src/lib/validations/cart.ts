import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "ID товара обязателен")
    .regex(/^[0-9a-fA-F]{24}$/, "Некорректный идентификатор товара"),
  quantity: z
    .number({ required_error: "Количество обязательно" })
    .int("Количество должно быть целым числом")
    .min(1, "Количество должно быть не менее 1"),
});

export const updateCartSchema = z.object({
  items: z.array(cartItemSchema, {
    required_error: "Список товаров обязателен",
  }),
  merge: z.boolean().optional(),
});

export const cartDetailsSchema = z.object({
  items: z.array(cartItemSchema, {
    required_error: "Список товаров обязателен",
  }),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type CartDetailsInput = z.infer<typeof cartDetailsSchema>;
