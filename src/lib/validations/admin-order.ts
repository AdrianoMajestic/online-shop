import { z } from "zod";

/**
 * Query schema for admin orders list
 */
export const adminOrdersQuerySchema = z.object({
  status: z
    .enum(["all", "new", "paid", "processing", "shipped", "completed", "cancelled"])
    .optional()
    .default("all"),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;

/**
 * Schema for updating order status by staff
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "new",
    "paid",
    "processing",
    "shipped",
    "completed",
    "cancelled",
  ]),
  comment: z.string().trim().max(1000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/**
 * Schema for adding internal manager comment
 */
export const addManagerCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Текст комментария не может быть пустым")
    .max(1000, "Текст комментария не может превышать 1000 символов"),
});

export type AddManagerCommentInput = z.infer<typeof addManagerCommentSchema>;
