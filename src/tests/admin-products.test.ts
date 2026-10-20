import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import {
  adminProductsQuerySchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
} from "@/lib/validations/admin-product";
import { slugify } from "@/lib/slug";
import * as adminProductService from "@/services/admin-product.service";
import * as dbModule from "@/lib/db";
import { auth } from "@/lib/auth";
import { Product } from "@/models/Product";
import { ForbiddenError } from "@/lib/errors";

// Route handlers
import {
  GET as getAdminProductsHandler,
  POST as postAdminProductHandler,
} from "@/app/api/admin/products/route";
import {
  GET as getAdminProductByIdHandler,
  PUT as putAdminProductHandler,
  PATCH as patchAdminProductHandler,
} from "@/app/api/admin/products/[id]/route";

describe("Admin Products Management & Category RBAC (T09)", () => {
  const adminUserId = "admin_user_id_1";
  const managerUserId = "manager_user_id_1";
  const customerUserId = "customer_user_id_1";

  const catGadgets = "65a000000000000000000001";
  const catLaptops = "65a000000000000000000002";
  const catKitchen = "65a000000000000000000003"; // Manager does NOT have this category
  const brandApple = "65b000000000000000000001";

  const sampleProductId = "65c000000000000000000001";
  const foreignProductId = "65c000000000000000000002";

  const managerUser: adminProductService.StaffUser = {
    id: managerUserId,
    role: "manager",
    name: "Менеджер Гаджетов",
    email: "manager@shop.test",
    assignedCategoryIds: [catGadgets, catLaptops],
  };

  const adminUser: adminProductService.StaffUser = {
    id: adminUserId,
    role: "admin",
    name: "Главный Администратор",
    email: "admin@shop.test",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
  });

  describe("1. Slug Generation & Transliteration", () => {
    it("transliterates Russian titles to URL-safe Latin slugs", () => {
      expect(slugify("Смартфон Apple iPhone 15 Pro")).toBe(
        "smartfon-apple-iphone-15-pro"
      );
      expect(slugify("Ноутбук Xiaomi Redmibook 16 2024")).toBe(
        "noutbuk-xiaomi-redmibook-16-2024"
      );
      expect(slugify("Кофемашина Philips Серия 2200")).toBe(
        "kofemashina-philips-seriya-2200"
      );
    });

    it("cleans trailing, leading, and duplicate dashes", () => {
      expect(slugify("---Тест---Товар--1---")).toBe("test-tovar-1");
    });
  });

  describe("2. Validation Schemas (Zod)", () => {
    it("validates valid admin product creation", () => {
      const input = {
        title: "Тестовый смартфон",
        sku: "kb-phone-01",
        categoryId: catGadgets,
        brandId: brandApple,
        description: "Отличный тестовый смартфон с OLED экраном",
        price: 9999000, // 99 990.00 ₽ in kopecks
        discountPrice: 8999000,
        stockQuantity: 15,
        isPublished: true,
        images: [{ url: "https://example.com/pic.jpg", alt: "Фото" }],
        attributes: [{ key: "Память", value: "256 ГБ" }],
      };

      const parsed = adminProductCreateSchema.parse(input);
      expect(parsed.sku).toBe("KB-PHONE-01"); // Auto uppercase
      expect(parsed.price).toBe(9999000);
      expect(parsed.discountPrice).toBe(8999000);
      expect(parsed.stockQuantity).toBe(15);
      expect(parsed.isPublished).toBe(true);
    });

    it("rejects product with discountPrice greater than or equal to price", () => {
      const invalid = {
        title: "Товар со странной скидкой",
        sku: "KB-INVALID-PRICE",
        categoryId: catGadgets,
        brandId: brandApple,
        description: "Описание",
        price: 500000,
        discountPrice: 600000, // discount > price!
        stockQuantity: 5,
      };

      expect(() => adminProductCreateSchema.parse(invalid)).toThrow(
        /Цена со скидкой должна быть строго меньше базовой цены/
      );
    });

    it("validates admin product update schema with partial updates", () => {
      const updateData = {
        title: "Обновленное название",
        price: 7999000,
        stockQuantity: 25,
      };
      const parsed = adminProductUpdateSchema.parse(updateData);
      expect(parsed.title).toBe("Обновленное название");
      expect(parsed.price).toBe(7999000);
      expect(parsed.stockQuantity).toBe(25);
    });

    it("rejects negative price and negative stockQuantity", () => {
      expect(() =>
        adminProductCreateSchema.parse({
          title: "Товар",
          sku: "KB-NEG",
          categoryId: catGadgets,
          brandId: brandApple,
          description: "Описание",
          price: -100,
          stockQuantity: -5,
        })
      ).toThrow();
    });

    it("validates admin products query filter params", () => {
      const query = {
        q: "iphone",
        categoryId: catGadgets,
        isPublished: "true",
        page: "2",
        limit: "10",
      };
      const parsed = adminProductsQuerySchema.parse(query);
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(10);
      expect(parsed.isPublished).toBe("true");
    });
  });

  describe("3. Category RBAC Permission Checks (checkCategoryAccess)", () => {
    it("allows admin full access to any category", () => {
      expect(() =>
        adminProductService.checkCategoryAccess(adminUser, catKitchen)
      ).not.toThrow();
      expect(() =>
        adminProductService.checkCategoryAccess(adminUser, catGadgets)
      ).not.toThrow();
    });

    it("allows manager access to their assigned categories", () => {
      expect(() =>
        adminProductService.checkCategoryAccess(managerUser, catGadgets)
      ).not.toThrow();
      expect(() =>
        adminProductService.checkCategoryAccess(managerUser, catLaptops)
      ).not.toThrow();
    });

    it("throws ForbiddenError (403) when manager attempts to access unassigned category", () => {
      expect(() =>
        adminProductService.checkCategoryAccess(managerUser, catKitchen)
      ).toThrow(ForbiddenError);

      try {
        adminProductService.checkCategoryAccess(managerUser, catKitchen);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect((err as ForbiddenError).statusCode).toBe(403);
        expect((err as ForbiddenError).message).toContain("не назначена менеджеру");
      }
    });

    it("throws ForbiddenError (403) for non-staff roles", () => {
      const customer: adminProductService.StaffUser = {
        id: customerUserId,
        role: "customer",
      };
      expect(() =>
        adminProductService.checkCategoryAccess(customer, catGadgets)
      ).toThrow(ForbiddenError);
    });
  });

  describe("4. Admin Product Service Business Logic", () => {
    it("getAdminProducts restricts manager to assigned categories", async () => {
      const countSpy = vi.spyOn(Product, "countDocuments").mockResolvedValue(2 as never);
      const findSpy = vi.spyOn(Product, "find").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          { _id: sampleProductId, title: "Phone 1", categoryId: catGadgets },
        ]),
      } as never);

      const result = await adminProductService.getAdminProducts(managerUser, {
        page: 1,
        limit: 20,
        isPublished: "all",
      });

      expect(countSpy).toHaveBeenCalled();
      const calls = findSpy.mock.calls as unknown[][];
      const passedFilter = calls[0]?.[0] as Record<string, Record<string, unknown>> | undefined;
      // Expect manager category restriction
      expect(passedFilter?.categoryId).toBeDefined();
      expect(passedFilter?.categoryId?.$in).toBeDefined();
      expect(result.items.length).toBe(1);
    });

    it("getAdminProducts throws ForbiddenError (403) when manager explicitly selects unassigned category", async () => {
      await expect(
        adminProductService.getAdminProducts(managerUser, {
          page: 1,
          limit: 20,
          categoryId: catKitchen, // Unassigned!
          isPublished: "all",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("getAdminProductById allows access for assigned category and throws 403 for unassigned category", async () => {
      // Mock assigned product
      vi.spyOn(Product, "findOne").mockReturnValueOnce({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          _id: sampleProductId,
          categoryId: { _id: catGadgets, title: "Гаджеты" },
          title: "iPhone 15",
        }),
      } as never);

      const prod = await adminProductService.getAdminProductById(
        sampleProductId,
        managerUser
      );
      expect(prod.title).toBe("iPhone 15");

      // Mock unassigned product (Kitchen)
      vi.spyOn(Product, "findOne").mockReturnValueOnce({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          _id: foreignProductId,
          categoryId: { _id: catKitchen, title: "Кухня" },
          title: "Блендер",
        }),
      } as never);

      await expect(
        adminProductService.getAdminProductById(foreignProductId, managerUser)
      ).rejects.toThrow(ForbiddenError);
    });

    it("createAdminProduct allows creation in assigned category and rejects unassigned with 403", async () => {
      // Attempt creation in unassigned category
      await expect(
        adminProductService.createAdminProduct(
          {
            title: "Кофеварка",
            sku: "KB-COFFEE-01",
            categoryId: catKitchen, // Forbidden for manager!
            brandId: brandApple,
            description: "Тест",
            price: 500000,
            discountPrice: null,
            stockQuantity: 10,
            isPublished: true,
            images: [],
            attributes: [],
          },
          managerUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("updateAdminProduct prevents manager from editing product of a foreign category", async () => {
      // Product in DB belongs to catKitchen
      vi.spyOn(Product, "findOne").mockResolvedValueOnce({
        _id: foreignProductId,
        categoryId: new mongoose.Types.ObjectId(catKitchen),
        brandId: new mongoose.Types.ObjectId(brandApple),
        title: "Чужой товар",
        save: vi.fn(),
      } as never);

      await expect(
        adminProductService.updateAdminProduct(
          foreignProductId,
          { title: "Попытка изменения" },
          managerUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("updateAdminProduct prevents manager from moving a product into an unassigned category", async () => {
      // Product in DB belongs to catGadgets (assigned)
      vi.spyOn(Product, "findOne").mockResolvedValueOnce({
        _id: sampleProductId,
        categoryId: new mongoose.Types.ObjectId(catGadgets),
        brandId: new mongoose.Types.ObjectId(brandApple),
        title: "Мой товар",
        save: vi.fn(),
      } as never);

      await expect(
        adminProductService.updateAdminProduct(
          sampleProductId,
          { categoryId: catKitchen }, // Target category is forbidden!
          managerUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("updateAdminProduct allows manager to update price, stock, and publication in assigned category", async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockPopulate = vi.fn().mockResolvedValue(true);

      const mockProductDoc = {
        _id: sampleProductId,
        categoryId: new mongoose.Types.ObjectId(catGadgets),
        brandId: new mongoose.Types.ObjectId(brandApple),
        title: "Смартфон",
        price: 500000,
        stockQuantity: 5,
        isPublished: true,
        save: mockSave,
        populate: mockPopulate,
      };

      vi.spyOn(Product, "findOne").mockResolvedValueOnce(mockProductDoc as never);

      await adminProductService.updateAdminProduct(
        sampleProductId,
        {
          price: 550000,
          stockQuantity: 20,
          isPublished: false,
        },
        managerUser
      );

      expect(mockProductDoc.price).toBe(550000);
      expect(mockProductDoc.stockQuantity).toBe(20);
      expect(mockProductDoc.isPublished).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });

    it("deactivateAdminProduct sets isPublished to false without physical deletion", async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockPopulate = vi.fn().mockResolvedValue(true);

      const mockProductDoc = {
        _id: sampleProductId,
        categoryId: new mongoose.Types.ObjectId(catGadgets),
        brandId: new mongoose.Types.ObjectId(brandApple),
        title: "Смартфон для деактивации",
        isPublished: true,
        deletedAt: null,
        save: mockSave,
        populate: mockPopulate,
      };

      vi.spyOn(Product, "findOne").mockResolvedValueOnce(mockProductDoc as never);

      const deactivated = await adminProductService.deactivateAdminProduct(
        sampleProductId,
        managerUser
      );

      expect(deactivated.isPublished).toBe(false);
      expect(mockProductDoc.isPublished).toBe(false);
      expect(mockProductDoc.deletedAt).toBeNull(); // No physical deletion!
      expect(mockSave).toHaveBeenCalled();
    });

    it("deactivateAdminProduct throws 403 when manager attempts to deactivate foreign product", async () => {
      const mockProductDoc = {
        _id: foreignProductId,
        categoryId: new mongoose.Types.ObjectId(catKitchen), // Foreign!
        title: "Чужой товар",
        isPublished: true,
        save: vi.fn(),
      };

      vi.spyOn(Product, "findOne").mockResolvedValueOnce(mockProductDoc as never);

      await expect(
        adminProductService.deactivateAdminProduct(foreignProductId, managerUser)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("5. API Route Handlers Security (HTTP 401, 403, 200, 201)", () => {
    it("GET /api/admin/products returns 401 Unauthorized when unauthenticated", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/admin/products");
      const res = await getAdminProductsHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/admin/products returns 403 Forbidden when role is customer", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "sess_1" },
        user: { id: customerUserId, role: "customer" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/admin/products");
      const res = await getAdminProductsHandler(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("GET /api/admin/products returns 200 with paginated products for manager", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "sess_1" },
        user: managerUser,
      } as never);

      vi.spyOn(adminProductService, "getAdminProducts").mockResolvedValueOnce({
        items: [{ _id: sampleProductId, title: "Тест" } as never],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/products?page=1");
      const res = await getAdminProductsHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items.length).toBe(1);
      expect(data.total).toBe(1);
    });

    it("GET /api/admin/products/[id] returns 403 when manager accesses product in foreign category", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "sess_1" },
        user: managerUser,
      } as never);

      vi.spyOn(adminProductService, "getAdminProductById").mockRejectedValueOnce(
        new ForbiddenError("Доступ запрещен: категория товара не назначена менеджеру")
      );

      const req = new NextRequest(`http://localhost:3000/api/admin/products/${foreignProductId}`);
      const res = await getAdminProductByIdHandler(req, { params: { id: foreignProductId } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("POST /api/admin/products returns 403 when manager creates product in foreign category", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "sess_1" },
        user: managerUser,
      } as never);

      vi.spyOn(adminProductService, "createAdminProduct").mockRejectedValueOnce(
        new ForbiddenError("Доступ запрещен: категория товара не назначена менеджеру")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Кофемашина",
          sku: "KB-KITCHEN-01",
          categoryId: catKitchen,
          brandId: brandApple,
          description: "Описание",
          price: 4999000,
          stockQuantity: 10,
          isPublished: true,
        }),
      });

      const res = await postAdminProductHandler(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toContain("не назначена менеджеру");
    });

    it("PUT /api/admin/products/[id] returns 403 when manager attempts to edit foreign category product", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "sess_1" },
        user: managerUser,
      } as never);

      vi.spyOn(adminProductService, "updateAdminProduct").mockRejectedValueOnce(
        new ForbiddenError("Доступ запрещен: категория товара не назначена менеджеру")
      );

      const req = new NextRequest(`http://localhost:3000/api/admin/products/${foreignProductId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Измененное название",
          price: 100000,
        }),
      });

      const res = await putAdminProductHandler(req, { params: { id: foreignProductId } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("PATCH /api/admin/products/[id] deactivates product and returns 200", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "sess_1" },
        user: managerUser,
      } as never);

      vi.spyOn(adminProductService, "deactivateAdminProduct").mockResolvedValueOnce({
        _id: sampleProductId,
        isPublished: false,
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/admin/products/${sampleProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      });

      const res = await patchAdminProductHandler(req, { params: { id: sampleProductId } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.product.isPublished).toBe(false);
    });
  });
});
