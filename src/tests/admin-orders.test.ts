import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import {
  adminOrdersQuerySchema,
  updateOrderStatusSchema,
  addManagerCommentSchema,
} from "@/lib/validations/admin-order";
import * as adminOrderService from "@/services/admin-order.service";
import * as dbModule from "@/lib/db";
import { auth } from "@/lib/auth";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { PromoCode } from "@/models/PromoCode";
import { Payment } from "@/models/Payment";
import { NotFoundError, ConflictError } from "@/lib/errors";

// Route handlers
import { GET as getAdminOrdersHandler } from "@/app/api/admin/orders/route";
import { GET as getAdminOrderByIdHandler } from "@/app/api/admin/orders/[id]/route";
import { PATCH as patchAdminOrderStatusHandler } from "@/app/api/admin/orders/[id]/status/route";
import { POST as postAdminOrderCommentHandler } from "@/app/api/admin/orders/[id]/comments/route";

describe("Admin Orders Management & Status Control (T10)", () => {
  const staffManager: adminOrderService.StaffUser = {
    id: "manager_1",
    role: "manager",
    name: "Иван Менеджеров",
    email: "manager@shop.test",
  };

  const sampleOrderId = "65d000000000000000000001";
  const sampleOrderNumber = "KB-10042";
  const sampleProductId1 = "65c000000000000000000010";
  const sampleProductId2 = "65c000000000000000000020";
  const samplePromoId = "65e000000000000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
  });

  describe("1. Validation Schemas (Zod)", () => {
    it("validates admin orders query parameters", () => {
      const parsed = adminOrdersQuerySchema.parse({
        status: "paid",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-20",
        q: "KB-100",
        page: "2",
        limit: "10",
      });
      expect(parsed.status).toBe("paid");
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(10);
      expect(parsed.q).toBe("KB-100");
    });

    it("validates update order status schema", () => {
      const parsed = updateOrderStatusSchema.parse({
        status: "processing",
        comment: "Передано на сборку",
      });
      expect(parsed.status).toBe("processing");
      expect(parsed.comment).toBe("Передано на сборку");
    });

    it("rejects invalid status in updateOrderStatusSchema", () => {
      expect(() =>
        updateOrderStatusSchema.parse({
          status: "unknown_status",
        })
      ).toThrow();
    });

    it("validates and trims manager comment", () => {
      const parsed = addManagerCommentSchema.parse({
        text: "  Связались с клиентом, подтвердил доставку после 18:00   ",
      });
      expect(parsed.text).toBe("Связались с клиентом, подтвердил доставку после 18:00");
    });

    it("rejects empty manager comment", () => {
      expect(() =>
        addManagerCommentSchema.parse({
          text: "   ",
        })
      ).toThrow();
    });
  });

  describe("2. Admin Order Service: Queries and Details", () => {
    it("getAdminOrders retrieves paginated orders with filters", async () => {
      vi.spyOn(Order, "countDocuments").mockResolvedValueOnce(1 as never);
      const findSpy = vi.spyOn(Order, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: sampleOrderId, number: sampleOrderNumber, status: "new" },
        ]),
      } as never);

      const result = await adminOrderService.getAdminOrders({
        status: "new",
        q: "KB-10042",
        page: 1,
        limit: 20,
      });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);

      const calls = findSpy.mock.calls as unknown[][];
      const filterArg = calls[0]?.[0] as Record<string, unknown>;
      expect(filterArg.status).toBe("new");
      expect(filterArg.$or).toBeDefined();
    });

    it("getAdminOrderById finds order by number and attaches payments", async () => {
      vi.spyOn(Order, "findOne").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        number: sampleOrderNumber,
        status: "paid",
      } as never);

      vi.spyOn(Payment, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "pmt_1",
            amount: 500000,
            status: "succeeded",
          },
        ]),
      } as never);

      const result = await adminOrderService.getAdminOrderById(sampleOrderNumber);
      expect(result.order.number).toBe(sampleOrderNumber);
      expect(result.payments.length).toBe(1);
      expect(result.payments[0]?.status).toBe("succeeded");
    });

    it("getAdminOrderById throws NotFoundError if order does not exist", async () => {
      vi.spyOn(Order, "findOne").mockResolvedValueOnce(null as never);

      await expect(
        adminOrderService.getAdminOrderById("KB-NONEXISTENT")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("3. Status Transitions, Stock Restoration and Notifications (A-05, A-06, A-18)", () => {
    it("updates order status from new to paid, appends to statusHistory, and logs notification", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockSave = vi.fn().mockResolvedValue(true);

      const mockOrder = {
        _id: sampleOrderId,
        number: sampleOrderNumber,
        status: "new",
        items: [],
        statusHistory: [] as { from: string; to: string; byUserId?: string; byUserName?: string; at: Date }[],
        managerComments: [] as { authorId: string; authorName?: string; text: string; at: Date }[],
        save: mockSave,
      };

      vi.spyOn(Order, "findOne").mockResolvedValueOnce(mockOrder as never);

      const updated = await adminOrderService.updateAdminOrderStatus(
        sampleOrderNumber,
        "paid",
        staffManager,
        "Оплата получена"
      );

      expect(updated.status).toBe("paid");
      expect(mockOrder.statusHistory.length).toBe(1);
      expect(mockOrder.statusHistory[0]?.from).toBe("new");
      expect(mockOrder.statusHistory[0]?.to).toBe("paid");
      expect(mockOrder.statusHistory[0]?.byUserName).toBe("Иван Менеджеров");

      // Verify comment appended
      expect(mockOrder.managerComments.length).toBe(1);
      expect(mockOrder.managerComments[0]?.text).toContain("Оплата получена");

      expect(mockSave).toHaveBeenCalled();
      // Verify A-18 log
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Order Notification] [A-18]")
      );
    });

    it("rejects invalid status transition (e.g. new -> completed) with ConflictError (409)", async () => {
      const mockOrder = {
        _id: sampleOrderId,
        number: sampleOrderNumber,
        status: "new",
        items: [],
        save: vi.fn(),
      };

      vi.spyOn(Order, "findOne").mockResolvedValueOnce(mockOrder as never);

      await expect(
        adminOrderService.updateAdminOrderStatus(
          sampleOrderNumber,
          "completed",
          staffManager
        )
      ).rejects.toThrow(ConflictError);
    });

    it("AUTOMATICALLY RESTORES STOCK QUANTITIES and rolls back promo code when order is cancelled (A-06)", async () => {
      const updateProductSpy = vi
        .spyOn(Product, "updateOne")
        .mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as never);

      const updatePromoSpy = vi
        .spyOn(PromoCode, "updateOne")
        .mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as never);

      const mockSave = vi.fn().mockResolvedValue(true);

      const mockOrder = {
        _id: sampleOrderId,
        number: sampleOrderNumber,
        status: "paid", // Can transition to cancelled
        items: [
          { productId: sampleProductId1, quantity: 2 },
          { productId: sampleProductId2, quantity: 1 },
        ],
        promo: {
          promoCodeId: samplePromoId,
          code: "SUMMER10",
        },
        statusHistory: [] as { from: string; to: string; byUserId?: string; byUserName?: string; at: Date }[],
        managerComments: [] as { authorId: string; authorName?: string; text: string; at: Date }[],
        save: mockSave,
      };

      vi.spyOn(Order, "findOne").mockResolvedValueOnce(mockOrder as never);

      const cancelledOrder = await adminOrderService.updateAdminOrderStatus(
        sampleOrderNumber,
        "cancelled",
        staffManager,
        "Клиент отказался от заказа"
      );

      expect(cancelledOrder.status).toBe("cancelled");
      expect(mockSave).toHaveBeenCalled();

      // Verify Product.updateOne called with $inc for each item
      expect(updateProductSpy).toHaveBeenCalledTimes(2);

      const calls = updateProductSpy.mock.calls as unknown[][];
      expect(calls[0]?.[0]).toEqual({ _id: sampleProductId1 });
      expect(calls[0]?.[1]).toEqual({ $inc: { stockQuantity: 2 } });

      expect(calls[1]?.[0]).toEqual({ _id: sampleProductId2 });
      expect(calls[1]?.[1]).toEqual({ $inc: { stockQuantity: 1 } });

      // Verify PromoCode.updateOne called with $inc: { usedCount: -1 }
      expect(updatePromoSpy).toHaveBeenCalledTimes(1);
      const promoCalls = updatePromoSpy.mock.calls as unknown[][];
      expect(promoCalls[0]?.[0]).toEqual({ _id: samplePromoId });
      expect(promoCalls[0]?.[1]).toEqual({ $inc: { usedCount: -1 } });
    });

    it("addAdminOrderComment appends internal comment and saves order", async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockOrder = {
        _id: sampleOrderId,
        number: sampleOrderNumber,
        managerComments: [] as { authorId: string; authorName?: string; text: string; at: Date }[],
        save: mockSave,
      };

      vi.spyOn(Order, "findOne").mockResolvedValueOnce(mockOrder as never);

      await adminOrderService.addAdminOrderComment(
        sampleOrderNumber,
        "Уточнен адрес доставки",
        staffManager
      );

      expect(mockOrder.managerComments.length).toBe(1);
      expect(mockOrder.managerComments[0]?.text).toBe("Уточнен адрес доставки");
      expect(mockOrder.managerComments[0]?.authorName).toBe("Иван Менеджеров");
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe("4. API Route Handlers Security & Behavior (HTTP 401, 403, 200, 201)", () => {
    it("GET /api/admin/orders returns 401 when unauthenticated", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/admin/orders");
      const res = await getAdminOrdersHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/admin/orders returns 403 when customer role attempts access", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "s1" },
        user: { id: "cust_1", role: "customer" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/admin/orders");
      const res = await getAdminOrdersHandler(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("GET /api/admin/orders returns 200 for staff", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "s1" },
        user: staffManager,
      } as never);

      vi.spyOn(adminOrderService, "getAdminOrders").mockResolvedValueOnce({
        items: [{ _id: sampleOrderId, number: sampleOrderNumber } as never],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/orders?page=1");
      const res = await getAdminOrdersHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items.length).toBe(1);
    });

    it("GET /api/admin/orders/[id] returns order details with payments", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "s1" },
        user: staffManager,
      } as never);

      vi.spyOn(adminOrderService, "getAdminOrderById").mockResolvedValueOnce({
        order: { number: sampleOrderNumber, status: "new" } as never,
        payments: [],
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${sampleOrderNumber}`);
      const res = await getAdminOrderByIdHandler(req, {
        params: { id: sampleOrderNumber },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.order.number).toBe(sampleOrderNumber);
    });

    it("PATCH /api/admin/orders/[id]/status returns 409 on invalid transition", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "s1" },
        user: staffManager,
      } as never);

      vi.spyOn(adminOrderService, "updateAdminOrderStatus").mockRejectedValueOnce(
        new ConflictError("Недопустимый переход статуса: с «Доставляется» на «Отменен»")
      );

      const req = new NextRequest(
        `http://localhost:3000/api/admin/orders/${sampleOrderNumber}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      const res = await patchAdminOrderStatusHandler(req, {
        params: { id: sampleOrderNumber },
      });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error.code).toBe("CONFLICT");
      expect(data.error.message).toContain("Недопустимый переход статуса");
    });

    it("POST /api/admin/orders/[id]/comments adds comment and returns 201", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
        session: { id: "s1" },
        user: staffManager,
      } as never);

      vi.spyOn(adminOrderService, "addAdminOrderComment").mockResolvedValueOnce({
        number: sampleOrderNumber,
        managerComments: [{ text: "Важная заметка" }],
      } as never);

      const req = new NextRequest(
        `http://localhost:3000/api/admin/orders/${sampleOrderNumber}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Важная заметка" }),
        }
      );

      const res = await postAdminOrderCommentHandler(req, {
        params: { id: sampleOrderNumber },
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.order.number).toBe(sampleOrderNumber);
    });
  });
});
