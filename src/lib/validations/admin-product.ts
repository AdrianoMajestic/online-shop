import { z } from "zod";

/**
 * Query parameters for admin products list
 */
export const adminProductsQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  isPublished: z.enum(["all", "true", "false"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminProductsQuery = z.infer<typeof adminProductsQuerySchema>;

/**
 * Image item schema
 */
export const productImageItemSchema = z.object({
  url: z.string().trim().min(1, "URL изображения обязателен"),
  alt: z.string().trim().default(""),
});

/**
 * Attribute item schema
 */
export const productAttributeItemSchema = z.object({
  key: z.string().trim().min(1, "Название характеристики обязательно"),
  value: z.string().trim().min(1, "Значение характеристики обязательно"),
});

/**
 * Product creation schema for admin
 */
export const adminProductCreateSchema = z
  .object({
    title: z
      .string()
      .min(2, "Название должно содержать не менее 2 символов")
      .max(255, "Название не может превышать 255 символов")
      .trim(),
    sku: z
      .string()
      .min(2, "Артикул (SKU) должен содержать не менее 2 символов")
      .max(50, "Артикул не может превышать 50 символов")
      .trim()
      .transform((val) => val.toUpperCase()),
    slug: z
      .string()
      .min(2, "Slug должен содержать не менее 2 символов")
      .max(255, "Slug не может превышать 255 символов")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug должен содержать только строчные латинские буквы, цифры и дефисы"
      )
      .trim()
      .optional(),
    categoryId: z.string().min(1, "Категория товара обязательна"),
    brandId: z.string().min(1, "Бренд товара обязателен"),
    description: z.string().min(1, "Описание товара обязательно").trim(),
    price: z
      .number({ required_error: "Цена товара обязательна" })
      .int("Цена должна быть целым числом в копейках")
      .min(0, "Цена не может быть отрицательной"),
    discountPrice: z
      .number()
      .int("Цена со скидкой должна быть целым числом в копейках")
      .min(0, "Цена со скидкой не может быть отрицательной")
      .nullable()
      .optional()
      .default(null),
    stockQuantity: z
      .number()
      .int("Остаток на складе должен быть целым числом")
      .min(0, "Остаток на складе не может быть отрицательным")
      .default(0),
    isPublished: z.boolean().default(true),
    images: z.array(productImageItemSchema).default([]),
    attributes: z.array(productAttributeItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountPrice !== null &&
      data.discountPrice !== undefined &&
      data.discountPrice >= data.price
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Цена со скидкой должна быть строго меньше базовой цены",
        path: ["discountPrice"],
      });
    }
  });

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;

/**
 * Product update schema for admin
 */
export const adminProductUpdateSchema = z
  .object({
    title: z
      .string()
      .min(2, "Название должно содержать не менее 2 символов")
      .max(255, "Название не может превышать 255 символов")
      .trim()
      .optional(),
    sku: z
      .string()
      .min(2, "Артикул (SKU) должен содержать не менее 2 символов")
      .max(50, "Артикул не может превышать 50 символов")
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),
    slug: z
      .string()
      .min(2, "Slug должен содержать не менее 2 символов")
      .max(255, "Slug не может превышать 255 символов")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug должен содержать только строчные латинские буквы, цифры и дефисы"
      )
      .trim()
      .optional(),
    categoryId: z.string().min(1, "Категория товара обязательна").optional(),
    brandId: z.string().min(1, "Бренд товара обязателен").optional(),
    description: z.string().min(1, "Описание товара обязательно").trim().optional(),
    price: z
      .number()
      .int("Цена должна быть целым числом в копейках")
      .min(0, "Цена не может быть отрицательной")
      .optional(),
    discountPrice: z
      .number()
      .int("Цена со скидкой должна быть целым числом в копейках")
      .min(0, "Цена со скидкой не может быть отрицательной")
      .nullable()
      .optional(),
    stockQuantity: z
      .number()
      .int("Остаток на складе должен быть целым числом")
      .min(0, "Остаток на складе не может быть отрицательным")
      .optional(),
    isPublished: z.boolean().optional(),
    images: z.array(productImageItemSchema).optional(),
    attributes: z.array(productAttributeItemSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountPrice !== null &&
      data.discountPrice !== undefined &&
      data.price !== undefined &&
      data.discountPrice >= data.price
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Цена со скидкой должна быть строго меньше базовой цены",
        path: ["discountPrice"],
      });
    }
  });

export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;

/**
 * Quick toggle/patch schema
 */
export const adminProductPatchSchema = z.object({
  action: z.enum(["deactivate", "activate", "toggle_publish", "update_stock", "update_price"]).optional(),
  isPublished: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  price: z.number().int().min(0).optional(),
});

export type AdminProductPatchInput = z.infer<typeof adminProductPatchSchema>;
