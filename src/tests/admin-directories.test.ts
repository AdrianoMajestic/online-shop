import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import * as dbModule from "@/lib/db";
import { auth } from "@/lib/auth";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { PromoCode } from "@/models/PromoCode";
import { Product } from "@/models/Product";
import { ConflictError } from "@/lib/errors";

import {
  adminCategoryCreateSchema,
  adminBrandCreateSchema,
  adminDeliveryMethodCreateSchema,
  adminPromoCodeCreateSchema,
  adminUpdateUserRoleSchema,
  adminToggleUserBanSchema,
  adminAssignManagerCategoriesSchema,
} from "@/lib/validations/admin-directory";

import * as adminDirectoryService from "@/services/admin-directory.service";

// Route handlers
import { POST as postCategoryRoute } from "@/app/api/admin/categories/route";
import { POST as postBrandRoute } from "@/app/api/admin/brands/route";
import { GET as getDeliveryMethodsRoute } from "@/app/api/admin/delivery-methods/route";
import { GET as getPromoCodesRoute } from "@/app/api/admin/promocodes/route";
import { GET as getPaymentMethodsRoute } from "@/app/api/admin/payment-methods/route";
import { GET as getUsersRoute } from "@/app/api/admin/users/route";
import { PATCH as patchUserRoleRoute } from "@/app/api/admin/users/[id]/role/route";
import { PATCH as patchUserBanRoute } from "@/app/api/admin/users/[id]/ban/route";

describe("Admin Directories, Users, Delivery & Promo Codes (T11)", () => {
  const adminId = "admin_user_001";
  const managerId = "manager_user_001";
  const customerId = "customer_user_001";

  const adminSession = {
    session: { id: "s_admin", userId: adminId },
    user: { id: adminId, role: "admin", name: "Главный Администратор", email: "admin@shop.test" },
  };

  const managerSession = {
    session: { id: "s_manager", userId: managerId },
    user: { id: managerId, role: "manager", name: "Менеджер Каталога", email: "manager@shop.test" },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
  });

  // ========================================================
  // 1. ZOD VALIDATION SCHEMAS
  // ========================================================
  describe("1. Validation Schemas (Zod)", () => {
    it("validates category creation with auto-slug and defaults", () => {
      const parsed = adminCategoryCreateSchema.parse({
        title: "Игровые консоли",
      });
      expect(parsed.title).toBe("Игровые консоли");
      expect(parsed.isVisible).toBe(true);
      expect(parsed.sortOrder).toBe(0);
    });

    it("rejects category with empty title or invalid slug regex", () => {
      expect(() =>
        adminCategoryCreateSchema.parse({
          title: "   ",
        })
      ).toThrow();

      expect(() =>
        adminCategoryCreateSchema.parse({
          title: "Компьютеры",
          slug: "INVALID_SLUG_С_КИРИЛЛИЦЕЙ!",
        })
      ).toThrow();
    });

    it("validates brand creation schema", () => {
      const parsed = adminBrandCreateSchema.parse({
        title: "Apple",
        slug: "apple",
        logoUrl: "https://example.com/apple.png",
      });
      expect(parsed.title).toBe("Apple");
      expect(parsed.slug).toBe("apple");
    });

    it("validates delivery method pricing in integer kopecks", () => {
      const parsed = adminDeliveryMethodCreateSchema.parse({
        code: "express_delivery",
        title: "Экспресс-доставка за 2 часа",
        price: 50000, // 500 руб
      });
      expect(parsed.price).toBe(50000);
      expect(parsed.code).toBe("express_delivery");

      // Rejects float price (rubles without conversion)
      expect(() =>
        adminDeliveryMethodCreateSchema.parse({
          code: "test",
          title: "Тест",
          price: 499.5,
        })
      ).toThrow();
    });

    it("validates percentage and fixed promo codes with date bounds", () => {
      // Percentage: 10%
      const perc = adminPromoCodeCreateSchema.parse({
        code: "sale10",
        discountType: "percentage",
        discountValue: 10,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
      });
      expect(perc.code).toBe("SALE10");

      // Rejects percentage > 100
      expect(() =>
        adminPromoCodeCreateSchema.parse({
          code: "SUPER150",
          discountType: "percentage",
          discountValue: 150,
          validFrom: new Date("2026-01-01"),
          validTo: new Date("2026-12-31"),
        })
      ).toThrow();

      // Rejects validTo before validFrom
      expect(() =>
        adminPromoCodeCreateSchema.parse({
          code: "BACKTOTHEFUTURE",
          discountType: "fixed",
          discountValue: 50000,
          validFrom: new Date("2026-12-31"),
          validTo: new Date("2026-01-01"),
        })
      ).toThrow();
    });

    it("validates user management schemas", () => {
      expect(adminUpdateUserRoleSchema.parse({ role: "manager" }).role).toBe("manager");
      expect(() => adminUpdateUserRoleSchema.parse({ role: "superadmin" })).toThrow();

      const ban = adminToggleUserBanSchema.parse({ banned: true, banReason: "Спам" });
      expect(ban.banned).toBe(true);
      expect(ban.banReason).toBe("Спам");

      const cats = adminAssignManagerCategoriesSchema.parse({
        assignedCategoryIds: ["65a000000000000000000001", "65a000000000000000000002"],
      });
      expect(cats.assignedCategoryIds).toHaveLength(2);
    });
  });

  // ========================================================
  // 2. CATEGORY, BRAND & DIRECTORIES BUSINESS LOGIC
  // ========================================================
  describe("2. Directory Service Operations & Conflict Protection", () => {
    it("createAdminCategory generates clean transliterated slug if slug omitted", async () => {
      vi.spyOn(Category, "findOne").mockResolvedValue(null);
      vi.spyOn(Category, "create").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        title: "Смартфоны и связь",
        slug: "smartfony-i-svyaz",
        description: "",
        isVisible: true,
        sortOrder: 0,
      } as never);

      const cat = await adminDirectoryService.createAdminCategory({
        title: "Смартфоны и связь",
        description: "",
        isVisible: true,
        sortOrder: 0,
      });

      expect(cat.slug).toBe("smartfony-i-svyaz");
      expect(cat.title).toBe("Смартфоны и связь");
    });

    it("deleteAdminCategory blocks deletion if category contains subcategories", async () => {
      const sampleId = new mongoose.Types.ObjectId();
      vi.spyOn(Category, "findById").mockResolvedValue({
        _id: sampleId,
        title: "Электроника",
      } as unknown as mongoose.Document);

      vi.spyOn(Category, "countDocuments").mockResolvedValue(3); // 3 children

      await expect(adminDirectoryService.deleteAdminCategory(sampleId.toString())).rejects.toThrow(
        ConflictError
      );
    });

    it("deleteAdminCategory blocks deletion if category contains products", async () => {
      const sampleId = new mongoose.Types.ObjectId();
      vi.spyOn(Category, "findById").mockResolvedValue({
        _id: sampleId,
        title: "Смартфоны",
      } as unknown as mongoose.Document);

      // 0 subcategories, but 12 products
      vi.spyOn(Category, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Product, "countDocuments").mockResolvedValue(12);

      await expect(adminDirectoryService.deleteAdminCategory(sampleId.toString())).rejects.toThrow(
        ConflictError
      );
    });

    it("deleteAdminBrand blocks deletion if brand has assigned products", async () => {
      const brandId = new mongoose.Types.ObjectId();
      vi.spyOn(Brand, "findById").mockResolvedValue({
        _id: brandId,
        title: "Apple",
      } as unknown as mongoose.Document);

      vi.spyOn(Product, "countDocuments").mockResolvedValue(8);

      await expect(adminDirectoryService.deleteAdminBrand(brandId.toString())).rejects.toThrow(
        ConflictError
      );
    });

    it("deleteAdminPromoCode deactivates promo code instead of hard delete if used in orders", async () => {
      const promoId = new mongoose.Types.ObjectId();
      const mockPromo = {
        _id: promoId,
        code: "USED2026",
        usedCount: 5,
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(PromoCode, "findById").mockResolvedValue(mockPromo as unknown as mongoose.Document);
      const deleteSpy = vi.spyOn(PromoCode, "findByIdAndDelete").mockResolvedValue(null);

      const result = await adminDirectoryService.deleteAdminPromoCode(promoId.toString());

      expect(mockPromo.isActive).toBe(false);
      expect(mockPromo.save).toHaveBeenCalled();
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(result.message).toContain("деактивирован");
    });
  });

  // ========================================================
  // 3. USER MANAGEMENT & SELF-PROTECTION RULES
  // ========================================================
  describe("3. User RBAC & Administrator Self-Protection Guarantees", () => {
    it("PREVENTS administrator from revoking their own admin role", async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            id: adminId,
            email: "admin@shop.test",
            role: "admin",
          }),
          updateOne: vi.fn(),
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as unknown as ReturnType<typeof dbModule.getMongoDb>);

      await expect(
        adminDirectoryService.updateAdminUserRole({
          currentAdminId: adminId,
          currentAdminEmail: "admin@shop.test",
          targetUserId: adminId,
          newRole: "customer",
        })
      ).rejects.toThrow(ConflictError);

      await expect(
        adminDirectoryService.updateAdminUserRole({
          currentAdminId: adminId,
          currentAdminEmail: "admin@shop.test",
          targetUserId: adminId,
          newRole: "manager",
        })
      ).rejects.toThrow("Администратор не может лишить самого себя роли администратора");
    });

    it("PREVENTS administrator from banning themselves", async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            id: adminId,
            email: "admin@shop.test",
            role: "admin",
          }),
          updateOne: vi.fn(),
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as unknown as ReturnType<typeof dbModule.getMongoDb>);

      await expect(
        adminDirectoryService.toggleAdminUserBan({
          currentAdminId: adminId,
          currentAdminEmail: "admin@shop.test",
          targetUserId: adminId,
          banned: true,
          banReason: "Случайный клик",
        })
      ).rejects.toThrow("Администратор не может заблокировать самого себя");
    });

    it("allows administrator to change role of another user", async () => {
      const updateMock = vi.fn().mockResolvedValue({ modifiedCount: 1 });
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            id: customerId,
            email: "user@shop.test",
            role: "customer",
          }),
          updateOne: updateMock,
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as unknown as ReturnType<typeof dbModule.getMongoDb>);

      const res = await adminDirectoryService.updateAdminUserRole({
        currentAdminId: adminId,
        currentAdminEmail: "admin@shop.test",
        targetUserId: customerId,
        newRole: "manager",
      });

      expect(res.role).toBe("manager");
      expect(updateMock).toHaveBeenCalled();
    });

    it("allows administrator to ban another user and deletes their active sessions", async () => {
      const updateMock = vi.fn().mockResolvedValue({ modifiedCount: 1 });
      const deleteSessionsMock = vi.fn().mockResolvedValue({ deletedCount: 2 });

      const mockDb = {
        collection: vi.fn().mockImplementation((name: string) => {
          if (name === "user") {
            return {
              findOne: vi.fn().mockResolvedValue({
                id: customerId,
                email: "spammer@shop.test",
                role: "customer",
              }),
              updateOne: updateMock,
            };
          }
          if (name === "session") {
            return {
              deleteMany: deleteSessionsMock,
            };
          }
          return {};
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as unknown as ReturnType<typeof dbModule.getMongoDb>);

      const res = await adminDirectoryService.toggleAdminUserBan({
        currentAdminId: adminId,
        currentAdminEmail: "admin@shop.test",
        targetUserId: customerId,
        banned: true,
        banReason: "Нарушение правил магазина",
      });

      expect(res.banned).toBe(true);
      expect(updateMock).toHaveBeenCalled();
      expect(deleteSessionsMock).toHaveBeenCalled();
    });

    it("assigns validated categories to a manager", async () => {
      const cat1 = new mongoose.Types.ObjectId().toString();
      const cat2 = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Category, "exists")
        .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId(cat1) } as unknown as { _id: mongoose.Types.ObjectId })
        .mockResolvedValueOnce(null); // second category doesn't exist

      const updateMock = vi.fn().mockResolvedValue({ modifiedCount: 1 });
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            id: managerId,
            email: "manager@shop.test",
            role: "manager",
          }),
          updateOne: updateMock,
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as unknown as ReturnType<typeof dbModule.getMongoDb>);

      const res = await adminDirectoryService.assignManagerCategories({
        targetUserId: managerId,
        assignedCategoryIds: [cat1, cat2],
      });

      // Only existing category cat1 should be assigned
      expect(res.assignedCategoryIds).toEqual([cat1]);
      expect(updateMock).toHaveBeenCalled();
    });
  });

  // ========================================================
  // 4. API ROUTE HANDLERS SECURITY (HTTP 401, 403, 200, 201)
  // ========================================================
  describe("4. API Route Handlers Security & Role Guarding", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/admin/users");
      const res = await getUsersRoute(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when a manager attempts admin actions", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(managerSession as never);

      // 1. Manager cannot view users list
      const reqUsers = new NextRequest("http://localhost:3000/api/admin/users");
      const resUsers = await getUsersRoute(reqUsers);
      expect(resUsers.status).toBe(403);

      // 2. Manager cannot create a category
      const reqCat = new NextRequest("http://localhost:3000/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ title: "Запрещенная категория" }),
      });
      const resCat = await postCategoryRoute(reqCat);
      expect(resCat.status).toBe(403);

      // 3. Manager cannot create a brand
      const reqBrand = new NextRequest("http://localhost:3000/api/admin/brands", {
        method: "POST",
        body: JSON.stringify({ title: "Запрещенный бренд" }),
      });
      const resBrand = await postBrandRoute(reqBrand);
      expect(resBrand.status).toBe(403);

      // 4. Manager cannot manage delivery methods
      const reqDel = new NextRequest("http://localhost:3000/api/admin/delivery-methods");
      const resDel = await getDeliveryMethodsRoute(reqDel);
      expect(resDel.status).toBe(403);

      // 5. Manager cannot manage promocodes
      const reqPromo = new NextRequest("http://localhost:3000/api/admin/promocodes");
      const resPromo = await getPromoCodesRoute(reqPromo);
      expect(resPromo.status).toBe(403);

      // 6. Manager cannot manage payment methods
      const reqPay = new NextRequest("http://localhost:3000/api/admin/payment-methods");
      const resPay = await getPaymentMethodsRoute(reqPay);
      expect(resPay.status).toBe(403);
    });

    it("allows admin to create category and returns 201 Created", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession as never);
      vi.spyOn(adminDirectoryService, "createAdminCategory").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        title: "Телевизоры",
        slug: "televizory",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ title: "Телевизоры" }),
      });
      const res = await postCategoryRoute(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.category.title).toBe("Телевизоры");
    });

    it("allows admin to view users list and returns 200 OK", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession as never);
      vi.spyOn(adminDirectoryService, "getAdminUsers").mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/users?role=customer");
      const res = await getUsersRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users).toBeDefined();
    });

    it("returns 409 Conflict when admin tries to strip own role via PATCH API", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession as never);
      vi.spyOn(adminDirectoryService, "updateAdminUserRole").mockRejectedValue(
        new ConflictError("Администратор не может лишить самого себя роли администратора")
      );

      const req = new NextRequest(`http://localhost:3000/api/admin/users/${adminId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "customer" }),
      });

      const res = await patchUserRoleRoute(req, { params: Promise.resolve({ id: adminId }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.message).toContain("Администратор не может лишить самого себя роли");
    });

    it("returns 409 Conflict when admin tries to ban self via PATCH API", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession as never);
      vi.spyOn(adminDirectoryService, "toggleAdminUserBan").mockRejectedValue(
        new ConflictError("Администратор не может заблокировать самого себя")
      );

      const req = new NextRequest(`http://localhost:3000/api/admin/users/${adminId}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ banned: true }),
      });

      const res = await patchUserBanRoute(req, { params: Promise.resolve({ id: adminId }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.message).toContain("Администратор не может заблокировать самого себя");
    });
  });
});
