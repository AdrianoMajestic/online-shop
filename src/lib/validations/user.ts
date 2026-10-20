import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string({ required_error: "Имя обязательно для заполнения" })
    .trim()
    .min(2, "Имя должно содержать не менее 2 символов")
    .max(100, "Имя не должно превышать 100 символов"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((val) => val || "")
    .refine(
      (val) => val === "" || /^[+0-9\s()\-]{6,25}$/.test(val),
      "Некорректный формат номера телефона (минимум 6 символов)"
    ),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Введите текущий пароль" })
      .min(1, "Введите текущий пароль"),
    newPassword: z
      .string({ required_error: "Введите новый пароль" })
      .min(8, "Новый пароль должен содержать не менее 8 символов")
      .max(128, "Новый пароль не должен превышать 128 символов")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        "Пароль должен содержать как минимум одну букву и одну цифру"
      ),
    confirmPassword: z
      .string({ required_error: "Подтвердите новый пароль" })
      .min(1, "Подтвердите новый пароль"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Новые пароли не совпадают",
    path: ["confirmPassword"],
  });

export const updateConsentsSchema = z.object({
  personalData: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateConsentsInput = z.infer<typeof updateConsentsSchema>;
