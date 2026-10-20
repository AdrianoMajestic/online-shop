import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import * as dbModule from "@/lib/db";
import { auth } from "@/lib/auth";
import { AuditLog, IAuditLog } from "@/models/AuditLog";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import {
  audit,
  getAuditLogs,
  getClientIp,
} from "@/services/audit";
import { updateAdminOrderStatus } from "@/services/admin-order.service";
import { updateAdminProduct, deactivateAdminProduct } from "@/services/admin-product.service";
import {
  updateAdminUserRole,
  toggleAdminUserBan,
  deleteAdminCategory,
} from "@/services/admin-directory.service";
import { GET as getAuditRoute } from "@/app/api/admin/audit/route";

describe("Audit Logging System & Admin Audit Page (T12)", () => {
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
  // 1. UNIVERSAL AUDIT HELPER UNIT TESTS
  // ========================================================
  describe("1. Universal Audit Helper (audit & getClientIp)", () => {
    it("extracts IP correctly from headers with x-forwarded-for or fallback", () => {
      const reqWithForwarded = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-forwarded-for": "198.51.100.42, 10.0.0.1" },
      });
      expect(getClientIp(reqWithForwarded)).toBe("198.51.100.42");

      const reqWithRealIp = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-real-ip": "203.0.113.19" },
      });
      expect(getClientIp(reqWithRealIp)).toBe("203.0.113.19");

      const reqEmpty = new NextRequest("http://localhost:3000/api/test");
      expect(getClientIp(reqEmpty)).toBe("127.0.0.1");
    });

    it("creates AuditLog record with 4 arguments extracting userId and ip from meta", async () => {
      const createMock = vi.spyOn(AuditLog, "create").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: adminId,
        action: "order.status_change",
        entity: "Order",
        entityId: "KB-10001",
        meta: { from: "new", to: "paid" },
        ip: "192.168.1.100",
        at: new Date(),
      } as never);

      const res = await audit("order.status_change", "Order", "KB-10001", {
        from: "new",
        to: "paid",
        userId: adminId,
        ip: "192.168.1.100",
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "order.status_change",
          entity: "Order",
          entityId: "KB-10001",
          userId: adminId,
          ip: "192.168.1.100",
        })
      );
      expect(res.action).toBe("order.status_change");
    });

    it("creates AuditLog record with 5 arguments with explicit options", async () => {
      const createMock = vi.spyOn(AuditLog, "create").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: managerId,
        action: "product.price_change",
        entity: "Product",
        entityId: "prod_001",
        meta: { oldPrice: 10000, newPrice: 15000, userEmail: "manager@shop.test" },
        ip: "10.0.0.5",
        at: new Date(),
      } as never);

      await audit(
        "product.price_change",
        "Product",
        "prod_001",
        { oldPrice: 10000, newPrice: 15000 },
        { userId: managerId, ip: "10.0.0.5", userEmail: "manager@shop.test" }
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "product.price_change",
          entity: "Product",
          entityId: "prod_001",
          userId: managerId,
          ip: "10.0.0.5",
          meta: expect.objectContaining({
            oldPrice: 10000,
            newPrice: 15000,
            userEmail: "manager@shop.test",
          }),
        })
      );
    });
  });

  // ========================================================
  // 2. BUSINESS OPERATION AUDIT INTEGRATION
  // ========================================================
  describe("2. Key Business Operations Audit Integration", () => {
    it("updateAdminOrderStatus creates AuditLog entry when status changes", async () => {
      const orderId = new mongoose.Types.ObjectId();
      const mockOrder = {
        _id: orderId,
        number: "KB-20042",
        status: "new",
        items: [],
        statusHistory: [],
        managerComments: [],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Order, "findById").mockResolvedValue(mockOrder as never);
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      const auditMock = vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await updateAdminOrderStatus(
        orderId.toString(),
        "paid",
        { id: adminId, name: "Администратор", email: "admin@shop.test", role: "admin" },
        "Оплата подтверждена",
        { ip: "192.168.1.50" }
      );

      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "order.status_change",
          entity: "Order",
          entityId: orderId.toString(),
          userId: adminId,
          ip: "192.168.1.50",
          meta: expect.objectContaining({
            orderNumber: "KB-20042",
            from: "new",
            to: "paid",
          }),
        })
      );
    });

    it("updateAdminProduct creates AuditLog entries on price and stock change", async () => {
      const prodId = new mongoose.Types.ObjectId();
      const catId = new mongoose.Types.ObjectId();
      const mockProduct = {
        _id: prodId,
        categoryId: catId,
        brandId: new mongoose.Types.ObjectId(),
        sku: "KB-SKU-1",
        slug: "kabachok-fresh",
        title: "Кабачок свежий",
        price: 15000,
        discountPrice: null,
        stockQuantity: 20,
        isPublished: true,
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Product, "findOne").mockResolvedValue(mockProduct as never);
      const auditMock = vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await updateAdminProduct(
        prodId.toString(),
        { price: 18000, stockQuantity: 35 },
        { id: managerId, role: "manager", assignedCategoryIds: [catId.toString()] },
        { ip: "172.16.0.1" }
      );

      // Expect price change audit log
      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "product.price_change",
          entity: "Product",
          entityId: prodId.toString(),
          userId: managerId,
          ip: "172.16.0.1",
          meta: expect.objectContaining({
            oldPrice: 15000,
            newPrice: 18000,
          }),
        })
      );

      // Expect stock change audit log
      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "product.stock_change",
          entity: "Product",
          entityId: prodId.toString(),
          userId: managerId,
          ip: "172.16.0.1",
          meta: expect.objectContaining({
            oldStock: 20,
            newStock: 35,
          }),
        })
      );
    });

    it("deactivateAdminProduct creates AuditLog entry with action product.deactivate", async () => {
      const prodId = new mongoose.Types.ObjectId();
      const catId = new mongoose.Types.ObjectId();
      const mockProduct = {
        _id: prodId,
        categoryId: catId,
        brandId: new mongoose.Types.ObjectId(),
        sku: "KB-SKU-2",
        title: "Баклажан",
        isPublished: true,
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Product, "findOne").mockResolvedValue(mockProduct as never);
      const auditMock = vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await deactivateAdminProduct(
        prodId.toString(),
        { id: adminId, role: "admin" },
        { ip: "10.0.0.1" }
      );

      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "product.deactivate",
          entity: "Product",
          entityId: prodId.toString(),
          userId: adminId,
          ip: "10.0.0.1",
          meta: expect.objectContaining({
            isPublished: false,
          }),
        })
      );
    });

    it("deleteAdminCategory creates AuditLog entry with action category.delete", async () => {
      const catId = new mongoose.Types.ObjectId();
      const mockCat = {
        _id: catId,
        title: "Сезонные овощи",
        slug: "sezonnye-ovoschi",
      };

      vi.spyOn(Category, "findById").mockResolvedValue(mockCat as never);
      vi.spyOn(Category, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Product, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Category, "findByIdAndDelete").mockResolvedValue(mockCat as never);

      const auditMock = vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await deleteAdminCategory(catId.toString(), {
        userId: adminId,
        ip: "192.168.0.22",
      });

      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "category.delete",
          entity: "Category",
          entityId: catId.toString(),
          userId: adminId,
          ip: "192.168.0.22",
          meta: expect.objectContaining({
            title: "Сезонные овощи",
            slug: "sezonnye-ovoschi",
          }),
        })
      );
    });

    it("updateAdminUserRole creates AuditLog entry with action user.role_change", async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            id: customerId,
            email: "user@shop.test",
            role: "customer",
          }),
          updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as never);

      const auditMock = vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await updateAdminUserRole({
        currentAdminId: adminId,
        currentAdminEmail: "admin@shop.test",
        targetUserId: customerId,
        newRole: "manager",
        ip: "172.20.10.2",
      });

      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.role_change",
          entity: "User",
          entityId: customerId,
          userId: adminId,
          ip: "172.20.10.2",
          meta: expect.objectContaining({
            oldRole: "customer",
            newRole: "manager",
            targetEmail: "user@shop.test",
          }),
        })
      );
    });

    it("toggleAdminUserBan creates AuditLog entry with action user.ban", async () => {
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            id: customerId,
            email: "spammer@shop.test",
            role: "customer",
          }),
          updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
          deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as never);

      const auditMock = vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await toggleAdminUserBan({
        currentAdminId: adminId,
        currentAdminEmail: "admin@shop.test",
        targetUserId: customerId,
        banned: true,
        banReason: "Нарушение правил площадки",
        ip: "192.168.1.1",
      });

      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "user.ban",
          entity: "User",
          entityId: customerId,
          userId: adminId,
          ip: "192.168.1.1",
          meta: expect.objectContaining({
            banned: true,
            banReason: "Нарушение правил площадки",
          }),
        })
      );
    });
  });

  // ========================================================
  // 3. GET AUDIT LOGS QUERY SERVICE
  // ========================================================
  describe("3. Audit Query Service (getAuditLogs)", () => {
    it("returns paginated audit logs with enriched user information and distinct lists", async () => {
      const sampleId = new mongoose.Types.ObjectId();
      const mockLog: IAuditLog = {
        _id: sampleId,
        userId: adminId,
        action: "user.login",
        entity: "User",
        entityId: adminId,
        meta: { email: "admin@shop.test" },
        ip: "127.0.0.1",
        at: new Date("2026-10-20T10:00:00Z"),
      } as never;

      vi.spyOn(AuditLog, "countDocuments").mockResolvedValue(1);
      vi.spyOn(AuditLog, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockLog]),
      } as never);

      vi.spyOn(AuditLog, "distinct").mockImplementation((field: string) => {
        if (field === "action") return Promise.resolve(["user.login", "order.status_change"]) as never;
        if (field === "entity") return Promise.resolve(["User", "Order"]) as never;
        return Promise.resolve([]) as never;
      });

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          find: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              { id: adminId, name: "Администратор Иван", email: "admin@shop.test" },
            ]),
          }),
        }),
      };
      vi.spyOn(dbModule, "getMongoDb").mockReturnValue(mockDb as never);

      const result = await getAuditLogs({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe("user.login");
      expect(result.logs[0].userName).toBe("Администратор Иван");
      expect(result.logs[0].userEmail).toBe("admin@shop.test");
      expect(result.availableActions).toContain("user.login");
      expect(result.availableEntities).toContain("User");
    });
  });

  // ========================================================
  // 4. API ROUTE SECURITY & ROLE GUARDING
  // ========================================================
  describe("4. API Route Handlers Security (HTTP 401, 403, 200)", () => {
    it("returns 401 Unauthorized when request is unauthenticated", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/admin/audit");
      const res = await getAuditRoute(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when customer or manager attempts access", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(managerSession as never);

      const req = new NextRequest("http://localhost:3000/api/admin/audit");
      const res = await getAuditRoute(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("returns 200 OK with audit logs list for administrator", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession as never);
      vi.spyOn(AuditLog, "countDocuments").mockResolvedValue(0);
      vi.spyOn(AuditLog, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);
      vi.spyOn(AuditLog, "distinct").mockResolvedValue([] as never);

      const req = new NextRequest("http://localhost:3000/api/admin/audit?page=1&limit=20");
      const res = await getAuditRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.logs).toBeDefined();
      expect(json.total).toBe(0);
    });
  });
});
