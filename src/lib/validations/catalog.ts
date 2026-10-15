import { z } from "zod";

export const getProductsQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brand: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.flatMap((v) => v.split(",")).map((s) => s.trim().toLowerCase()).filter(Boolean);
      }
      return val
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }),
  priceMin: z
    .string()
    .optional()
    .transform((val) => (val !== undefined && val !== "" ? Number(val) : undefined))
    .pipe(z.number().int().min(0, "Минимальная цена не может быть отрицательной").optional()),
  priceMax: z
    .string()
    .optional()
    .transform((val) => (val !== undefined && val !== "" ? Number(val) : undefined))
    .pipe(z.number().int().min(0, "Максимальная цена не может быть отрицательной").optional()),
  sort: z
    .enum(["popular", "price_asc", "price_desc", "new", "rating"])
    .default("popular"),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .pipe(z.number().int().min(1, "Номер страницы должен быть >= 1").default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 20))
    .pipe(z.number().int().min(1, "Лимит товаров должен быть >= 1").max(100, "Максимальный лимит — 100").default(20)),
}).refine(
  (data) => {
    if (data.priceMin !== undefined && data.priceMax !== undefined) {
      return data.priceMin <= data.priceMax;
    }
    return true;
  },
  {
    message: "Минимальная цена не может превышать максимальную",
    path: ["priceMin"],
  }
);

export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;
