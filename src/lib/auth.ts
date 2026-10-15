import { betterAuth, APIError } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins/admin";
import { defaultAc, adminAc } from "better-auth/plugins/admin/access";
import { createAuthMiddleware } from "better-auth/api";
import { getMongoClient, getMongoDb } from "@/lib/db";

// RBAC roles definition
const customerRole = defaultAc.newRole({
  user: [],
  session: [],
});

const managerRole = defaultAc.newRole({
  user: ["get", "list"],
  session: ["list"],
});

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "super_secret_better_auth_token_at_least_32_characters_long",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: mongodbAdapter(getMongoDb(), {
    client: getMongoClient(),
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 10,
      },
    },
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
      phone: {
        type: "string",
        required: false,
      },
      assignedCategoryIds: {
        type: "string[]",
        required: false,
        defaultValue: [],
      },
      consents: {
        type: "json",
        required: false,
      },
      deletedAt: {
        type: "date",
        required: false,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const body = ctx.body as Record<string, unknown>;

        // 1. Mandatory consent check (152-FZ)
        const consents = body?.consents as
          | { personalData?: { given?: boolean } }
          | undefined;
        const pdConsentGiven = consents?.personalData?.given === true;

        if (!pdConsentGiven) {
          throw new APIError("BAD_REQUEST", {
            message: "Необходимо согласие на обработку персональных данных",
          });
        }

        // 2. Password complexity validation (>= 8 chars, letters and digits)
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

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
