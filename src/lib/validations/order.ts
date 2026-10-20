import { z } from "zod";
import { cartItemSchema } from "./cart";

export const validatePromoSchema = z.object({
  code: z
    .string({ required_error: "Промокод обязателен" })
    .trim()
    .min(1, "Промокод не может быть пустым"),
  items: z.array(cartItemSchema).optional(),
  totalAmount: z
    .number()
    .int("Сумма должна быть целым числом в копейках")
    .min(0, "Сумма не может быть отрицательной")
    .optional(),
});

export const orderContactSchema = z.object({
  fullName: z
    .string({ required_error: "ФИО обязательно для заполнения" })
    .trim()
    .min(2, "ФИО должно содержать не менее 2 символов"),
  phone: z
    .string({ required_error: "Номер телефона обязателен" })
    .trim()
    .min(6, "Номер телефона должен содержать не менее 6 символов"),
  email: z
    .string({ required_error: "Email обязателен" })
    .trim()
    .email("Некорректный адрес электронной почты"),
});

export const orderShippingAddressSchema = z.object({
  city: z
    .string({ required_error: "Город обязателен" })
    .trim()
    .min(1, "Город обязателен для заполнения"),
  street: z
    .string({ required_error: "Улица обязательна" })
    .trim()
    .min(1, "Улица обязательна для заполнения"),
  house: z
    .string({ required_error: "Номер дома обязателен" })
    .trim()
    .min(1, "Номер дома обязателен для заполнения"),
  apartment: z.string().trim().optional(),
  postalCode: z
    .string({ required_error: "Почтовый индекс обязателен" })
    .trim()
    .min(5, "Почтовый индекс должен содержать от 5 символов"),
  comment: z.string().trim().optional(),
});

export const createOrderSchema = z.object({
  contact: orderContactSchema,
  shippingAddress: orderShippingAddressSchema,
  deliveryMethodId: z
    .string({ required_error: "Выберите способ доставки" })
    .trim()
    .min(1, "Выберите способ доставки"),
  paymentMethod: z.enum(["card_online", "cod"], {
    errorMap: () => ({ message: "Выберите корректный способ оплаты (card_online или cod)" }),
  }),
  items: z
    .array(cartItemSchema, { required_error: "Состав заказа обязателен" })
    .min(1, "В заказе должен быть хотя бы один товар"),
  promoCode: z.string().trim().optional(),
  customerComment: z.string().trim().optional(),
  saveAddress: z.boolean().optional(),
});

export const createAddressSchema = z.object({
  city: z.string().trim().min(1, "Город обязателен"),
  street: z.string().trim().min(1, "Улица обязательна"),
  house: z.string().trim().min(1, "Номер дома обязателен"),
  apartment: z.string().trim().optional().default(""),
  postalCode: z.string().trim().min(5, "Почтовый индекс должен быть от 5 символов"),
  comment: z.string().trim().optional().default(""),
});

export type ValidatePromoInput = z.infer<typeof validatePromoSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderContactInput = z.infer<typeof orderContactSchema>;
export type OrderShippingAddressInput = z.infer<typeof orderShippingAddressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
