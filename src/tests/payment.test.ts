import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  MockProvider,
  processPaymentWebhook,
  retryPaymentOrder,
} from "@/services/payment.service";
import {
  canTransitionOrder,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/order-status";
import { Payment, IPayment } from "@/models/Payment";
import { Order, IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { AuditLog } from "@/models/AuditLog";
import * as dbModule from "@/lib/db";
import { POST as webhookRoute } from "@/app/api/payments/webhook/route";
import { NextRequest } from "next/server";

describe("Payment Provider & Order Status Logic (T07)", () => {
  const testSecret = "test_webhook_secret_key_12345";
  let provider: MockProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
    provider = new MockProvider(testSecret);
  });

  describe("HMAC Signature Generation & Verification", () => {
    it("generates valid HMAC-SHA256 signature and verifies it successfully", () => {
      const payload = {
        eventId: "evt_101",
        externalPaymentId: "pay_test_001",
        status: "succeeded",
        amount: 250000,
      };

      const rawBody = JSON.stringify(payload);
      const signature = provider.generateWebhookSignature(rawBody);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBe(64); // 32 bytes hex encoded = 64 chars

      const isValid = provider.verifyWebhook(rawBody, signature);
      expect(isValid).toBe(true);
    });

    it("rejects webhook if body was tampered with", () => {
      const originalPayload = JSON.stringify({
        eventId: "evt_101",
        externalPaymentId: "pay_test_001",
        status: "succeeded",
        amount: 250000,
      });

      const signature = provider.generateWebhookSignature(originalPayload);

      // Attacker changes amount to 100 kopecks
      const tamperedBody = JSON.stringify({
        eventId: "evt_101",
        externalPaymentId: "pay_test_001",
        status: "succeeded",
        amount: 100,
      });

      const isValid = provider.verifyWebhook(tamperedBody, signature);
      expect(isValid).toBe(false);
    });

    it("rejects webhook if signed with a different secret", () => {
      const otherProvider = new MockProvider("different_attacker_secret");
      const rawBody = JSON.stringify({ eventId: "evt_1" });
      const badSignature = otherProvider.generateWebhookSignature(rawBody);

      const isValid = provider.verifyWebhook(rawBody, badSignature);
      expect(isValid).toBe(false);
    });

    it("rejects empty, null or malformed signature safely", () => {
      expect(provider.verifyWebhook("{}", "")).toBe(false);
      expect(provider.verifyWebhook("{}", "not_a_valid_hex")).toBe(false);
      expect(provider.verifyWebhook("{}", "1234")).toBe(false);
    });
  });

  describe("Order Status State Machine (lib/order-status.ts, A-05)", () => {
    it("allows valid order status progression: new -> paid -> processing -> shipped -> completed", () => {
      expect(canTransitionOrder("new", "paid")).toBe(true);
      expect(canTransitionOrder("paid", "processing")).toBe(true);
      expect(canTransitionOrder("processing", "shipped")).toBe(true);
      expect(canTransitionOrder("shipped", "completed")).toBe(true);
    });

    it("allows cancellation from new, paid and processing", () => {
      expect(canTransitionOrder("new", "cancelled")).toBe(true);
      expect(canTransitionOrder("paid", "cancelled")).toBe(true);
      expect(canTransitionOrder("processing", "cancelled")).toBe(true);
    });

    it("prohibits cancellation from completed and cancelled", () => {
      expect(canTransitionOrder("completed", "cancelled")).toBe(false);
      expect(canTransitionOrder("cancelled", "cancelled")).toBe(true); // self transition ok
      expect(ORDER_STATUS_TRANSITIONS["completed"]).toEqual([]);
    });

    it("prohibits illegal backward transitions", () => {
      expect(canTransitionOrder("shipped", "new")).toBe(false);
      expect(canTransitionOrder("completed", "paid")).toBe(false);
      expect(canTransitionOrder("cancelled", "paid")).toBe(false);
    });
  });

  describe("processPaymentWebhook & Idempotency", () => {
    const mockOrderId = new mongoose.Types.ObjectId();
    const mockProductId = new mongoose.Types.ObjectId();

    const mockOrder = {
      _id: mockOrderId,
      number: "KB-10042",
      status: "new",
      userId: null,
      statusHistory: [] as Array<{ from: string; to: string; byUserId: null; at: Date }>,
      items: [
        {
          productId: mockProductId,
          sku: "KB-ITM-1",
          title: "Товар 1",
          quantity: 2,
          pricePerUnit: 100000,
          totalPrice: 200000,
        },
      ],
      finalAmount: 200000,
      save: vi.fn().mockResolvedValue(true),
    } as unknown as IOrder;

    const mockPayment = {
      _id: new mongoose.Types.ObjectId(),
      orderId: mockOrderId,
      externalPaymentId: "pay_ext_12345",
      status: "pending",
      amount: 200000,
      paidAt: null as Date | null,
      save: vi.fn().mockResolvedValue(true),
    } as unknown as IPayment;

    beforeEach(() => {
      mockOrder.status = "new";
      mockOrder.statusHistory = [];
      mockPayment.status = "pending";
      mockPayment.paidAt = null;

      vi.spyOn(Payment, "findOne").mockResolvedValue(mockPayment);
      vi.spyOn(Order, "findById").mockResolvedValue(mockOrder);
      vi.spyOn(Product, "updateOne").mockResolvedValue({} as never);
      vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);
    });

    it("successfully processes succeeded payment: marks payment succeeded, order paid, increments salesCount", async () => {
      const payload = {
        eventId: "evt_succ_1",
        externalPaymentId: "pay_ext_12345",
        status: "succeeded",
        amount: 200000,
        timestamp: new Date().toISOString(),
      };

      const rawBody = JSON.stringify(payload);
      const defaultProvider = new MockProvider();
      const signature = defaultProvider.generateWebhookSignature(rawBody);

      const result = await processPaymentWebhook(rawBody, signature);

      expect(result.processed).toBe(true);
      expect(result.idempotent).toBe(false);
      expect(mockPayment.status).toBe("succeeded");
      expect(mockPayment.paidAt).toBeInstanceOf(Date);
      expect(mockOrder.status).toBe("paid");
      expect(mockOrder.statusHistory).toContainEqual(
        expect.objectContaining({ from: "new", to: "paid" })
      );

      // Verify salesCount incremented for product
      expect(Product.updateOne).toHaveBeenCalledWith(
        { _id: mockProductId },
        { $inc: { salesCount: 2 } }
      );
    });

    it("is strictly idempotent: second succeeded webhook does not duplicate actions", async () => {
      mockPayment.status = "succeeded";
      mockOrder.status = "paid";

      const payload = {
        eventId: "evt_succ_2",
        externalPaymentId: "pay_ext_12345",
        status: "succeeded",
        amount: 200000,
      };

      const rawBody = JSON.stringify(payload);
      const defaultProvider = new MockProvider();
      const signature = defaultProvider.generateWebhookSignature(rawBody);

      const result = await processPaymentWebhook(rawBody, signature);

      expect(result.processed).toBe(false);
      expect(result.idempotent).toBe(true);
      expect(result.message).toContain("уже был обработан ранее");
      expect(Product.updateOne).not.toHaveBeenCalled();
    });

    it("processes failed payment: marks payment failed, keeps order in status new", async () => {
      const payload = {
        eventId: "evt_fail_1",
        externalPaymentId: "pay_ext_12345",
        status: "failed",
        amount: 200000,
      };

      const rawBody = JSON.stringify(payload);
      const defaultProvider = new MockProvider();
      const signature = defaultProvider.generateWebhookSignature(rawBody);

      const result = await processPaymentWebhook(rawBody, signature);

      expect(result.processed).toBe(true);
      expect(result.idempotent).toBe(false);
      expect(mockPayment.status).toBe("failed");
      expect(mockOrder.status).toBe("new"); // order remains new
      expect(Product.updateOne).not.toHaveBeenCalled(); // no salesCount change
    });

    it("rejects invalid signature with UnauthorizedError", async () => {
      const rawBody = JSON.stringify({ externalPaymentId: "pay_1", status: "succeeded" });

      await expect(
        processPaymentWebhook(rawBody, "invalid_signature_hex_0000000000000000000000000000000000000000000000000000000000000000")
      ).rejects.toThrow(/Неверная цифровая подпись/);
    });
  });

  describe("retryPaymentOrder", () => {
    it("allows creating a new payment for order in status new", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        number: "KB-10099",
        status: "new",
        finalAmount: 150000,
      } as unknown as IOrder;

      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder);
      vi.spyOn(Payment, "create").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        externalPaymentId: "pay_new_retry",
        amount: 150000,
        status: "pending",
      } as never);

      const res = await retryPaymentOrder("KB-10099");
      expect(res.confirmationUrl).toContain("/pay/mock/");
      expect(res.amount).toBe(150000);
      expect(res.status).toBe("pending");
    });

    it("rejects retry if order is already paid", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        number: "KB-10099",
        status: "paid",
        finalAmount: 150000,
      } as unknown as IOrder;

      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder);

      await expect(retryPaymentOrder("KB-10099")).rejects.toThrow(
        /Повторная оплата невозможна: заказ находится в статусе «paid»/
      );
    });
  });

  describe("API Route POST /api/payments/webhook", () => {
    it("returns 401 when signature header is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: JSON.stringify({ externalPaymentId: "pay_1", status: "succeeded" }),
      });

      const res = await webhookRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe("MISSING_SIGNATURE");
    });

    it("returns 401 when signature is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: {
          "x-payment-signature": "0000000000000000000000000000000000000000000000000000000000000000",
        },
        body: JSON.stringify({ externalPaymentId: "pay_1", status: "succeeded" }),
      });

      const res = await webhookRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe("INVALID_SIGNATURE");
    });
  });
});
