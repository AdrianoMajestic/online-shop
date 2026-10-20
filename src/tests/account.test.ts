import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import {
  updateProfileSchema,
  changePasswordSchema,
  updateConsentsSchema,
} from "@/lib/validations/user";
import * as accountService from "@/services/account.service";
import * as dbModule from "@/lib/db";
import { auth } from "@/lib/auth";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { Product } from "@/models/Product";
import { Cart } from "@/models/Cart";
import { PromoCode } from "@/models/PromoCode";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";

// Route handlers
import { GET as getAddressesHandler } from "@/app/api/addresses/route";
import {
  GET as getAddressByIdHandler,
  PUT as putAddressHandler,
  DELETE as deleteAddressHandler,
} from "@/app/api/addresses/[id]/route";
import { GET as getOrdersHandler } from "@/app/api/orders/route";
import { GET as getOrderByIdHandler } from "@/app/api/orders/[id]/route";
import { POST as cancelOrderHandler } from "@/app/api/orders/[id]/cancel/route";
import { POST as repeatOrderHandler } from "@/app/api/orders/[id]/repeat/route";
import {
  GET as getProfileHandler,
  PATCH as patchProfileHandler,
} from "@/app/api/user/profile/route";
import { POST as changePasswordHandler } from "@/app/api/user/change-password/route";
import { PATCH as patchConsentsHandler } from "@/app/api/user/consents/route";

describe("Account Business Logic, Security & API (T08)", () => {
  const currentUserId = "user_1234567890abcdef12345678";
  const foreignUserId = "user_9999999999abcdef99999999";
  const sampleOrderId = "65a000000000000000000100";
  const sampleAddressId = "65a000000000000000000200";
  const sampleProductId = "65a000000000000000000300";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
  });

  describe("Validation Schemas (User, Password, Consents)", () => {
    it("validates update profile input", () => {
      const valid = { name: "Иван Петров", phone: "+79991234567" };
      const parsed = updateProfileSchema.parse(valid);
      expect(parsed.name).toBe("Иван Петров");
      expect(parsed.phone).toBe("+79991234567");
    });

    it("rejects profile with too short name", () => {
      expect(() =>
        updateProfileSchema.parse({ name: "A", phone: "+79991234567" })
      ).toThrow();
    });

    it("validates change password schema with matching passwords", () => {
      const valid = {
        currentPassword: "Passw0rd1",
        newPassword: "NewSecretPassword2",
        confirmPassword: "NewSecretPassword2",
      };
      const parsed = changePasswordSchema.parse(valid);
      expect(parsed.newPassword).toBe("NewSecretPassword2");
    });

    it("rejects new password without letters or numbers", () => {
      expect(() =>
        changePasswordSchema.parse({
          currentPassword: "Passw0rd1",
          newPassword: "onlyletters",
          confirmPassword: "onlyletters",
        })
      ).toThrow();

      expect(() =>
        changePasswordSchema.parse({
          currentPassword: "Passw0rd1",
          newPassword: "1234567890",
          confirmPassword: "1234567890",
        })
      ).toThrow();
    });

    it("rejects change password when passwords do not match", () => {
      expect(() =>
        changePasswordSchema.parse({
          currentPassword: "Passw0rd1",
          newPassword: "NewPassword1",
          confirmPassword: "DifferentPassword2",
        })
      ).toThrow(/не совпадают/);
    });

    it("validates consents schema", () => {
      const parsed = updateConsentsSchema.parse({
        personalData: true,
        marketing: false,
      });
      expect(parsed.personalData).toBe(true);
      expect(parsed.marketing).toBe(false);
    });
  });

  describe("Server Protection & Ownership Verification (Addresses)", () => {
    it("allows owner to fetch their address", async () => {
      const mockAddress = {
        _id: new mongoose.Types.ObjectId(sampleAddressId),
        userId: currentUserId,
        city: "Москва",
        street: "Арбат",
        house: "1",
        postalCode: "119002",
      };
      vi.spyOn(Address, "findById").mockResolvedValue(mockAddress as never);

      const result = await accountService.getUserAddressById(
        sampleAddressId,
        currentUserId
      );
      expect(result).toBeDefined();
      expect(result.city).toBe("Москва");
    });

    it("strictly rejects foreign user trying to read another user's address (403)", async () => {
      const foreignAddress = {
        _id: new mongoose.Types.ObjectId(sampleAddressId),
        userId: foreignUserId,
        city: "Казань",
      };
      vi.spyOn(Address, "findById").mockResolvedValue(foreignAddress as never);

      await expect(
        accountService.getUserAddressById(sampleAddressId, currentUserId)
      ).rejects.toThrow(ForbiddenError);
    });

    it("strictly rejects foreign user trying to update another user's address (403)", async () => {
      const foreignAddress = {
        _id: new mongoose.Types.ObjectId(sampleAddressId),
        userId: foreignUserId,
        city: "Казань",
      };
      vi.spyOn(Address, "findById").mockResolvedValue(foreignAddress as never);

      await expect(
        accountService.updateUserAddress(sampleAddressId, currentUserId, {
          city: "Москва",
          street: "Тверская",
          house: "2",
          apartment: "",
          postalCode: "101000",
          comment: "",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("strictly rejects foreign user trying to delete another user's address (403)", async () => {
      const foreignAddress = {
        _id: new mongoose.Types.ObjectId(sampleAddressId),
        userId: foreignUserId,
      };
      vi.spyOn(Address, "findById").mockResolvedValue(foreignAddress as never);

      await expect(
        accountService.deleteUserAddress(sampleAddressId, currentUserId)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Server Protection & Ownership Verification (Orders)", () => {
    it("allows owner to view their order", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        number: "KB-10001",
        userId: currentUserId,
        status: "new",
        items: [],
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      const result = await accountService.getUserOrderById(
        sampleOrderId,
        currentUserId
      );
      expect(result).toBeDefined();
      expect(result.number).toBe("KB-10001");
    });

    it("strictly rejects access to another user's order with 403 ForbiddenError", async () => {
      const foreignOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        number: "KB-10002",
        userId: foreignUserId, // owned by someone else!
        status: "new",
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(foreignOrder as never);

      await expect(
        accountService.getUserOrderById(sampleOrderId, currentUserId)
      ).rejects.toThrow(ForbiddenError);
    });

    it("returns 404 when order does not exist", async () => {
      vi.spyOn(Order, "findOne").mockResolvedValue(null);

      await expect(
        accountService.getUserOrderById("65a000000000000000000999", currentUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Order Cancellation Logic (A-11 & A-06)", () => {
    it("successfully cancels order in status 'new', updates statusHistory and restores stock", async () => {
      const saveMock = vi.fn().mockResolvedValue(true);
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        number: "KB-10001",
        userId: currentUserId,
        status: "new",
        items: [
          {
            productId: new mongoose.Types.ObjectId(sampleProductId),
            quantity: 3,
            title: "Товар 1",
          },
        ],
        promo: {
          promoCodeId: new mongoose.Types.ObjectId("65a000000000000000000020"),
          code: "PROMO10",
        },
        statusHistory: [] as Array<{ from: string; to: string; at: Date }>,
        save: saveMock,
      };

      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);
      const updateProductSpy = vi
        .spyOn(Product, "updateOne")
        .mockResolvedValue({} as never);
      const updatePromoSpy = vi
        .spyOn(PromoCode, "updateOne")
        .mockResolvedValue({} as never);

      const cancelled = await accountService.cancelUserOrder(
        sampleOrderId,
        currentUserId
      );

      expect(cancelled.status).toBe("cancelled");
      expect(mockOrder.statusHistory.length).toBe(1);
      expect(mockOrder.statusHistory[0].from).toBe("new");
      expect(mockOrder.statusHistory[0].to).toBe("cancelled");

      // Verify stock was restored ($inc +3)
      expect(updateProductSpy).toHaveBeenCalledWith(
        { _id: mockOrder.items[0].productId },
        { $inc: { stockQuantity: 3 } }
      );

      // Verify promo code usedCount was decremented ($inc -1)
      expect(updatePromoSpy).toHaveBeenCalledWith(
        { _id: mockOrder.promo.promoCodeId },
        { $inc: { usedCount: -1 } }
      );

      expect(saveMock).toHaveBeenCalled();
    });

    it("strictly forbids cancellation when status is 'paid' (A-11)", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        userId: currentUserId,
        status: "paid", // not new!
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      await expect(
        accountService.cancelUserOrder(sampleOrderId, currentUserId)
      ).rejects.toThrow(ConflictError);
    });

    it("strictly forbids cancellation when status is 'processing' (A-11)", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        userId: currentUserId,
        status: "processing",
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      await expect(
        accountService.cancelUserOrder(sampleOrderId, currentUserId)
      ).rejects.toThrow(ConflictError);
    });

    it("strictly forbids cancellation when status is 'shipped' or 'completed' (A-11)", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        userId: currentUserId,
        status: "shipped",
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      await expect(
        accountService.cancelUserOrder(sampleOrderId, currentUserId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Repeat Order Logic (T08 req 27)", () => {
    it("adds available items to cart and caps quantity at available stock", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        userId: currentUserId,
        items: [
          {
            productId: new mongoose.Types.ObjectId(sampleProductId),
            quantity: 2,
            title: "MacBook Pro",
          },
        ],
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(sampleProductId),
          title: "MacBook Pro",
          isPublished: true,
          deletedAt: null,
          stockQuantity: 5,
        },
      ];
      vi.spyOn(Product, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockProducts),
      } as never);

      const cartSaveMock = vi.fn().mockResolvedValue(true);
      const mockCart = {
        userId: currentUserId,
        items: [] as Array<{ productId: mongoose.Types.ObjectId; quantity: number }>,
        save: cartSaveMock,
      };
      vi.spyOn(Cart, "findOne").mockResolvedValue(mockCart as never);

      const result = await accountService.repeatUserOrder(
        sampleOrderId,
        currentUserId
      );

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(result.outOfStockCount).toBe(0);
      expect(mockCart.items.length).toBe(1);
      expect(mockCart.items[0].quantity).toBe(2);
      expect(cartSaveMock).toHaveBeenCalled();
    });

    it("skips out-of-stock items and reports them in unavailableItems", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(sampleOrderId),
        userId: currentUserId,
        items: [
          {
            productId: new mongoose.Types.ObjectId(sampleProductId),
            quantity: 1,
            title: "Закончившийся товар",
          },
        ],
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(mockOrder as never);

      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(sampleProductId),
          title: "Закончившийся товар",
          isPublished: true,
          deletedAt: null,
          stockQuantity: 0, // Out of stock!
        },
      ];
      vi.spyOn(Product, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockProducts),
      } as never);

      const result = await accountService.repeatUserOrder(
        sampleOrderId,
        currentUserId
      );

      expect(result.success).toBe(false);
      expect(result.addedCount).toBe(0);
      expect(result.outOfStockCount).toBe(1);
      expect(result.unavailableItems[0].title).toBe("Закончившийся товар");
    });
  });

  describe("API Route Handlers (HTTP 401, 403, 200)", () => {
    it("GET /api/addresses returns saved addresses", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(Address, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ city: "Москва" }]),
        }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/addresses");
      const res = await getAddressesHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.addresses.length).toBe(1);
    });

    it("GET /api/addresses/[id] returns address details for owner", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "getUserAddressById").mockResolvedValue({
        _id: sampleAddressId,
        city: "Москва",
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/addresses/${sampleAddressId}`);
      const res = await getAddressByIdHandler(req, { params: { id: sampleAddressId } });
      expect(res.status).toBe(200);
    });

    it("PUT /api/addresses/[id] updates address and returns 200", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "updateUserAddress").mockResolvedValue({
        _id: sampleAddressId,
        city: "Санкт-Петербург",
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/addresses/${sampleAddressId}`, {
        method: "PUT",
        body: JSON.stringify({
          city: "Санкт-Петербург",
          street: "Невский",
          house: "1",
          postalCode: "190000",
        }),
      });
      const res = await putAddressHandler(req, { params: { id: sampleAddressId } });
      expect(res.status).toBe(200);
    });

    it("DELETE /api/addresses/[id] deletes address and returns 200", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "deleteUserAddress").mockResolvedValue({
        success: true,
      });

      const req = new NextRequest(`http://localhost:3000/api/addresses/${sampleAddressId}`, {
        method: "DELETE",
      });
      const res = await deleteAddressHandler(req, { params: { id: sampleAddressId } });
      expect(res.status).toBe(200);
    });

    it("GET /api/orders returns 401 for unauthenticated request", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(null as never);
      const req = new NextRequest("http://localhost:3000/api/orders");
      const res = await getOrdersHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/orders returns orders for authenticated user", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "getUserOrders").mockResolvedValue([
        { number: "KB-10001", status: "new" } as never,
      ]);

      const req = new NextRequest("http://localhost:3000/api/orders?status=new");
      const res = await getOrdersHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.orders.length).toBe(1);
    });

    it("GET /api/orders/[id] returns 403 when user attempts to access foreign order", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "getUserOrderById").mockRejectedValue(
        new ForbiddenError("Доступ запрещен: чужой заказ")
      );

      const req = new NextRequest(
        `http://localhost:3000/api/orders/${sampleOrderId}`
      );
      const res = await getOrderByIdHandler(req, {
        params: { id: sampleOrderId },
      });
      expect(res.status).toBe(403);
    });

    it("POST /api/orders/[id]/cancel returns 409 when order is not in status new", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "cancelUserOrder").mockRejectedValue(
        new ConflictError("Отмена заказа возможна только в статусе «Новый»")
      );

      const req = new NextRequest(
        `http://localhost:3000/api/orders/${sampleOrderId}/cancel`,
        { method: "POST" }
      );
      const res = await cancelOrderHandler(req, {
        params: { id: sampleOrderId },
      });
      expect(res.status).toBe(409);
    });

    it("POST /api/orders/[id]/repeat returns repeat order summary", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "repeatUserOrder").mockResolvedValue({
        success: true,
        addedCount: 1,
        outOfStockCount: 0,
        message: "Товары добавлены в корзину",
        addedItems: [],
        unavailableItems: [],
      });

      const req = new NextRequest(
        `http://localhost:3000/api/orders/${sampleOrderId}/repeat`,
        { method: "POST" }
      );
      const res = await repeatOrderHandler(req, {
        params: { id: sampleOrderId },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("GET /api/user/profile returns profile data", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "getUserProfile").mockResolvedValue({
        id: currentUserId,
        name: "Иван",
        email: "ivan@test.ru",
        role: "customer",
        phone: "+79991234567",
      });

      const req = new NextRequest("http://localhost:3000/api/user/profile");
      const res = await getProfileHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.profile.name).toBe("Иван");
    });

    it("POST /api/user/change-password changes password successfully", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "changeUserPassword").mockResolvedValue({
        success: true,
        message: "Пароль успешно изменен",
      });

      const req = new NextRequest("http://localhost:3000/api/user/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "OldPassword1",
          newPassword: "NewSecretPassword2",
          confirmPassword: "NewSecretPassword2",
        }),
      });
      const res = await changePasswordHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("PATCH /api/user/profile updates user and returns 200", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "updateUserProfile").mockResolvedValue({
        name: "Петр Васильев",
        phone: "+79001112233",
      });

      const req = new NextRequest("http://localhost:3000/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "Петр Васильев", phone: "+79001112233" }),
      });
      const res = await patchProfileHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.name).toBe("Петр Васильев");
    });

    it("PATCH /api/user/consents updates consents and returns 200", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue({
        user: { id: currentUserId },
      } as never);
      vi.spyOn(accountService, "updateUserConsents").mockResolvedValue({
        personalData: { given: false, at: new Date() },
        marketing: { given: true, at: new Date() },
      });

      const req = new NextRequest("http://localhost:3000/api/user/consents", {
        method: "PATCH",
        body: JSON.stringify({ personalData: false, marketing: true }),
      });
      const res = await patchConsentsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.consents.personalData.given).toBe(false);
      expect(data.consents.marketing.given).toBe(true);
    });
  });
});
