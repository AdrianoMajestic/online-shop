import { z } from "zod";

// ==================== CATEGORIES ====================

export const adminCategoryCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название категории должно содержать не менее 2 символов")
    .max(100, "Название категории не может превышать 100 символов"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug должен содержать не менее 2 символов")
    .max(100, "Slug не может превышать 100 символов")
    .regex(/^[a-z0-9-]+$/, "Slug может содержать только строчные латинские буквы, цифры и дефисы")
    .optional(),
  parentId: z.string().trim().nullable().optional(),
  description: z.string().trim().max(1000, "Описание не может превышать 1000 символов").optional().default(""),
  isVisible: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0, "Порядок сортировки не может быть отрицательным").optional().default(0),
});

export const adminCategoryUpdateSchema = adminCategoryCreateSchema.partial();

export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryUpdateInput = z.infer<typeof adminCategoryUpdateSchema>;

// ==================== BRANDS ====================

export const adminBrandCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название бренда должно содержать не менее 2 символов")
    .max(100, "Название бренда не может превышать 100 символов"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug должен содержать не менее 2 символов")
    .max(100, "Slug не может превышать 100 символов")
    .regex(/^[a-z0-9-]+$/, "Slug может содержать только строчные латинские буквы, цифры и дефисы")
    .optional(),
  logoUrl: z.string().trim().max(1000).optional().default(""),
  description: z.string().trim().max(1000, "Описание не может превышать 1000 символов").optional().default(""),
});

export const adminBrandUpdateSchema = adminBrandCreateSchema.partial();

export type AdminBrandCreateInput = z.infer<typeof adminBrandCreateSchema>;
export type AdminBrandUpdateInput = z.infer<typeof adminBrandUpdateSchema>;

// ==================== DELIVERY METHODS ====================

export const adminDeliveryMethodCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Код доставки должен содержать не менее 2 символов")
    .max(50, "Код доставки не может превышать 50 символов")
    .regex(/^[a-z0-9_-]+$/, "Код доставки может содержать только строчные буквы, цифры, дефис и подчеркивание"),
  title: z
    .string()
    .trim()
    .min(2, "Название доставки должно содержать не менее 2 символов")
    .max(100, "Название доставки не может превышать 100 символов"),
  price: z.coerce
    .number()
    .int("Стоимость доставки должна быть целым числом в копейках")
    .min(0, "Стоимость доставки не может быть отрицательной"),
  description: z.string().trim().max(500, "Описание не может превышать 500 символов").optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export const adminDeliveryMethodUpdateSchema = adminDeliveryMethodCreateSchema.partial();

export type AdminDeliveryMethodCreateInput = z.infer<typeof adminDeliveryMethodCreateSchema>;
export type AdminDeliveryMethodUpdateInput = z.infer<typeof adminDeliveryMethodUpdateSchema>;

// ==================== PROMO CODES ====================

export const adminPromoCodeCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, "Код промокода должен содержать не менее 2 символов")
      .max(30, "Код промокода не может превышать 30 символов")
      .regex(/^[A-Z0-9_-]+$/, "Код промокода может содержать только заглавные латинские буквы, цифры, дефис и подчеркивание"),
    discountType: z.enum(["percentage", "fixed"], {
      errorMap: () => ({ message: "Тип скидки должен быть percentage или fixed" }),
    }),
    discountValue: z.coerce
      .number()
      .min(1, "Значение скидки должно быть больше 0"),
    minOrderAmount: z.coerce
      .number()
      .int("Минимальная сумма заказа должна быть целым числом в копейках")
      .min(0, "Минимальная сумма заказа не может быть отрицательной")
      .optional()
      .default(0),
    validFrom: z.coerce.date({
      errorMap: () => ({ message: "Некорректная дата начала действия" }),
    }),
    validTo: z.coerce.date({
      errorMap: () => ({ message: "Некорректная дата окончания действия" }),
    }),
    usageLimit: z.coerce
      .number()
      .int("Лимит использований должен быть целым числом")
      .min(0, "Лимит использований не может быть отрицательным")
      .optional()
      .default(0),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.discountType === "percentage") {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return Number.isInteger(data.discountValue) && data.discountValue > 0;
    },
    {
      message: "Для процентной скидки значение должно быть от 1 до 100%, для фиксированной — целым числом копеек > 0",
      path: ["discountValue"],
    }
  )
  .refine(
    (data) => data.validTo > data.validFrom,
    {
      message: "Дата окончания действия должна быть позже даты начала",
      path: ["validTo"],
    }
  );

export const adminPromoCodeUpdateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(30)
      .regex(/^[A-Z0-9_-]+$/)
      .optional(),
    discountType: z.enum(["percentage", "fixed"]).optional(),
    discountValue: z.coerce.number().min(1).optional(),
    minOrderAmount: z.coerce.number().int().min(0).optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    usageLimit: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === "percentage" && data.discountValue !== undefined) {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      if (data.discountType === "fixed" && data.discountValue !== undefined) {
        return Number.isInteger(data.discountValue) && data.discountValue > 0;
      }
      return true;
    },
    {
      message: "Для процентной скидки значение должно быть от 1 до 100%, для фиксированной — целым числом копеек > 0",
      path: ["discountValue"],
    }
  )
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return data.validTo > data.validFrom;
      }
      return true;
    },
    {
      message: "Дата окончания действия должна быть позже даты начала",
      path: ["validTo"],
    }
  );

export type AdminPromoCodeCreateInput = z.infer<typeof adminPromoCodeCreateSchema>;
export type AdminPromoCodeUpdateInput = z.infer<typeof adminPromoCodeUpdateSchema>;

// ==================== USERS ====================

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(["all", "customer", "manager", "admin"]).optional().default("all"),
  status: z.enum(["all", "active", "banned"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(["customer", "manager", "admin"], {
    errorMap: () => ({ message: "Роль должна быть customer, manager или admin" }),
  }),
});

export const adminToggleUserBanSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().trim().max(500).optional(),
});

export const adminAssignManagerCategoriesSchema = z.object({
  assignedCategoryIds: z.array(z.string().trim()).default([]),
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminToggleUserBanInput = z.infer<typeof adminToggleUserBanSchema>;
export type AdminAssignManagerCategoriesInput = z.infer<typeof adminAssignManagerCategoriesSchema>;
