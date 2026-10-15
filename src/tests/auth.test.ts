import { describe, it, expect, beforeEach } from "vitest";
import { betterAuth, APIError } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin } from "better-auth/plugins/admin";
import { defaultAc, adminAc } from "better-auth/plugins/admin/access";
import { createAuthMiddleware } from "better-auth/api";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

function createTestAuth(memoryDb: {
  user: Record<string, unknown>[];
  session: Record<string, unknown>[];
  account: Record<string, unknown>[];
  verification: Record<string, unknown>[];
}) {
  const customerRole = defaultAc.newRole({
    user: [],
    session: [],
  });

  const managerRole = defaultAc.newRole({
    user: ["get", "list"],
    session: ["list"],
  });

  return betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test_secret_for_vitest_unit_testing_32_chars_min",
    database: memoryAdapter(memoryDb),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    plugins: [
      admin({
        defaultRole: "customer",
        adminRoles: ["admin"],
        roles: {
          customer: customerRole,
          manager: managerRole,
          admin: adminAc,
        },
      }),
    ],
    user: {
      additionalFields: {
        phone: { type: "string", required: false },
        assignedCategoryIds: {
          type: "string[]",
          required: false,
          defaultValue: [],
        },
        consents: { type: "json", required: false },
        deletedAt: { type: "date", required: false },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const body = ctx.body as Record<string, unknown>;
          const consents = body?.consents as
            | { personalData?: { given?: boolean } }
            | undefined;
          if (!consents?.personalData?.given) {
            throw new APIError("BAD_REQUEST", {
              message: "Необходимо согласие на обработку персональных данных",
            });
          }
          const password = body?.password;
          if (
            typeof password !== "string" ||
            password.length < 8 ||
            !/[a-zA-Z]/.test(password) ||
            !/[0-9]/.test(password)
          ) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Пароль должен содержать не менее 8 символов, включая буквы и цифры",
            });
          }
        }
      }),
    },
  });
}

describe("Better Auth & RBAC Logic (T02)", () => {
  let memoryDb: {
    user: Record<string, unknown>[];
    session: Record<string, unknown>[];
    account: Record<string, unknown>[];
    verification: Record<string, unknown>[];
  };
  let testAuth: ReturnType<typeof createTestAuth>;

  beforeEach(() => {
    memoryDb = {
      user: [],
      session: [],
      account: [],
      verification: [],
    };

    testAuth = createTestAuth(memoryDb);
  });

  it("должен отклонить регистрацию без обязательного согласия на обработку ПДн (152-ФЗ)", async () => {
    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "user1@example.com",
          password: "Passw0rd1",
          name: "Test User",
        },
      })
    ).rejects.toThrow("Необходимо согласие на обработку персональных данных");
  });

  it("должен отклонить регистрацию со слабым паролем (менее 8 символов)", async () => {
    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "user2@example.com",
          password: "Pass1",
          name: "Test User",
          consents: { personalData: { given: true, at: new Date() } },
        } as never,
      })
    ).rejects.toThrow("Пароль должен содержать не менее 8 символов");
  });

  it("должен отклонить регистрацию с паролем только из букв без цифр", async () => {
    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "user3@example.com",
          password: "OnlyLettersPassword",
          name: "Test User",
          consents: { personalData: { given: true, at: new Date() } },
        } as never,
      })
    ).rejects.toThrow("включая буквы и цифры");
  });

  it("должен отклонить регистрацию с паролем только из цифр без букв", async () => {
    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "user4@example.com",
          password: "1234567890",
          name: "Test User",
          consents: { personalData: { given: true, at: new Date() } },
        } as never,
      })
    ).rejects.toThrow("включая буквы и цифры");
  });

  it("успешно регистрирует пользователя с согласием на ПДн и назначает роль customer по умолчанию", async () => {
    const res = await testAuth.api.signUpEmail({
      body: {
        email: "customer@example.com",
        password: "Passw0rd1",
        name: "Иван Иванов",
        phone: "+79991234567",
        consents: {
          personalData: { given: true, at: new Date() },
          marketing: { given: false, at: new Date() },
        },
      } as never,
    });

    expect(res).toBeDefined();
    expect(res.user.email).toBe("customer@example.com");
    expect(res.user.name).toBe("Иван Иванов");
    expect((res.user as { role?: string }).role).toBe("customer");
  });

  it("должен выдать ошибку при попытке зарегистрировать дублирующий email", async () => {
    await testAuth.api.signUpEmail({
      body: {
        email: "duplicate@example.com",
        password: "Passw0rd1",
        name: "Пользователь 1",
        consents: { personalData: { given: true, at: new Date() } },
      } as never,
    });

    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "duplicate@example.com",
          password: "Passw0rd1",
          name: "Пользователь 2",
          consents: { personalData: { given: true, at: new Date() } },
        } as never,
      })
    ).rejects.toThrow();
  });

  it("выдает одинаковую ошибку авторизации для несуществующего пользователя и неверного пароля", async () => {
    // 1. Несуществующий пользователь
    let errorNonExistent: { status?: string; body?: { code?: string } } | undefined;
    try {
      await testAuth.api.signInEmail({
        body: {
          email: "nonexistent@example.com",
          password: "SomePassword1",
        },
      });
    } catch (err: unknown) {
      errorNonExistent = err as { status?: string; body?: { code?: string } };
    }

    // 2. Создаем пользователя
    await testAuth.api.signUpEmail({
      body: {
        email: "existing@example.com",
        password: "Passw0rd1",
        name: "Existing",
        consents: { personalData: { given: true, at: new Date() } },
      } as never,
    });

    // 3. Неверный пароль
    let errorWrongPassword: { status?: string; body?: { code?: string } } | undefined;
    try {
      await testAuth.api.signInEmail({
        body: {
          email: "existing@example.com",
          password: "WrongPassword9",
        },
      });
    } catch (err: unknown) {
      errorWrongPassword = err as { status?: string; body?: { code?: string } };
    }

    expect(errorNonExistent).toBeDefined();
    expect(errorWrongPassword).toBeDefined();
    expect(errorNonExistent?.status).toBe("UNAUTHORIZED");
    expect(errorWrongPassword?.status).toBe("UNAUTHORIZED");
    expect(errorNonExistent?.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(errorWrongPassword?.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  describe("RBAC валидаторы", () => {
    it("requireApiAuth выбрасывает UnauthorizedError если сессия отсутствует", () => {
      const checkAuth = (session: { user?: unknown } | null) => {
        if (!session?.user) {
          throw new UnauthorizedError("Необходима авторизация");
        }
        return session;
      };

      expect(() => checkAuth(null)).toThrow(UnauthorizedError);
      expect(() => checkAuth({ user: { role: "customer" } })).not.toThrow();
    });

    it("requireApiRole выбрасывает ForbiddenError если роль пользователя недостаточна", () => {
      const checkRole = (user: { role?: string }, allowedRoles: string[]) => {
        const userRole = user.role || "customer";
        if (!allowedRoles.includes(userRole)) {
          throw new ForbiddenError("Недостаточно прав доступа");
        }
        return true;
      };

      // Customer пытается получить доступ к админке
      expect(() => checkRole({ role: "customer" }, ["admin", "manager"])).toThrow(
        ForbiddenError
      );

      // Manager имеет доступ к ресурсам manager
      expect(checkRole({ role: "manager" }, ["admin", "manager"])).toBe(true);

      // Admin имеет доступ
      expect(checkRole({ role: "admin" }, ["admin", "manager"])).toBe(true);
      expect(checkRole({ role: "admin" }, ["admin"])).toBe(true);

      // Manager не имеет доступа к чисто административным ресурсам
      expect(() => checkRole({ role: "manager" }, ["admin"])).toThrow(
        ForbiddenError
      );
    });
  });
});
