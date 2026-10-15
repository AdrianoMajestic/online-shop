import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import {
  Category,
  Brand,
  Product,
  PromoCode,
  DeliveryMethod,
  Review,
  Order,
} from "@/models";

describe("Mongoose Models Validation Unit Tests", () => {
  describe("Category Model", () => {
    it("fails validation without required title and slug", () => {
      const category = new Category();
      const err = category.validateSync();
      expect(err?.errors["title"]).toBeDefined();
      expect(err?.errors["slug"]).toBeDefined();
    });

    it("passes validation with valid fields", () => {
      const category = new Category({
        title: "Электроника",
        slug: "elektronika",
        description: "Тестовая категория",
      });
      const err = category.validateSync();
      expect(err).toBeUndefined();
      expect(category.isVisible).toBe(true);
      expect(category.parentId).toBeNull();
    });
  });

  describe("Brand Model", () => {
    it("fails validation without required title and slug", () => {
      const brand = new Brand();
      const err = brand.validateSync();
      expect(err?.errors["title"]).toBeDefined();
      expect(err?.errors["slug"]).toBeDefined();
    });

    it("passes validation with valid fields", () => {
      const brand = new Brand({
        title: "Apple",
        slug: "apple",
        description: "Техника Apple",
      });
      const err = brand.validateSync();
      expect(err).toBeUndefined();
    });
  });

  describe("DeliveryMethod Model", () => {
    it("validates price to be integer in kopecks and non-negative", () => {
      const invalidDelivery = new DeliveryMethod({
        code: "courier",
        title: "Курьер",
        price: -100,
      });
      const err = invalidDelivery.validateSync();
      expect(err?.errors["price"]).toBeDefined();
    });

    it("passes validation for valid delivery method", () => {
      const validDelivery = new DeliveryMethod({
        code: "courier",
        title: "Курьерская доставка",
        price: 35000,
      });
      const err = validDelivery.validateSync();
      expect(err).toBeUndefined();
      expect(validDelivery.isActive).toBe(true);
    });
  });

  describe("Product Model", () => {
    it("validates price to be integer in kopecks and non-negative", () => {
      const invalidProduct = new Product({
        categoryId: new mongoose.Types.ObjectId(),
        brandId: new mongoose.Types.ObjectId(),
        sku: "TEST-SKU-1",
        title: "Тестовый товар",
        slug: "test-product-1",
        description: "Описание",
        price: 99.99, // Non-integer
        stockQuantity: 10,
      });

      const err = invalidProduct.validateSync();
      expect(err?.errors["price"]).toBeDefined();
      expect(err?.errors["price"].message).toContain("в копейках");
    });

    it("fails validation if stockQuantity is negative", () => {
      const invalidProduct = new Product({
        categoryId: new mongoose.Types.ObjectId(),
        brandId: new mongoose.Types.ObjectId(),
        sku: "TEST-SKU-2",
        title: "Тестовый товар 2",
        slug: "test-product-2",
        description: "Описание",
        price: 100000,
        stockQuantity: -5,
      });

      const err = invalidProduct.validateSync();
      expect(err?.errors["stockQuantity"]).toBeDefined();
    });

    it("passes validation with integer price and valid fields", () => {
      const product = new Product({
        categoryId: new mongoose.Types.ObjectId(),
        brandId: new mongoose.Types.ObjectId(),
        sku: "TEST-SKU-3",
        title: "Тестовый смартфон",
        slug: "test-smartphone",
        description: "Отличный смартфон",
        price: 4999000, // 49 990.00 руб
        discountPrice: 4499000,
        stockQuantity: 15,
        attributes: [{ key: "Память", value: "256 ГБ" }],
      });

      const err = product.validateSync();
      expect(err).toBeUndefined();
      expect(product.isPublished).toBe(true);
      expect(product.deletedAt).toBeNull();
    });
  });

  describe("PromoCode Model", () => {
    it("validates percentage discountValue to be between 1 and 100", () => {
      const invalidPromo = new PromoCode({
        code: "INVALID150",
        discountType: "percentage",
        discountValue: 150, // Invalid: > 100%
        validFrom: new Date(),
        validTo: new Date(),
      });

      const err = invalidPromo.validateSync();
      expect(err?.errors["discountValue"]).toBeDefined();
    });

    it("passes validation for valid fixed amount promo in kopecks", () => {
      const validPromo = new PromoCode({
        code: "FIXED500",
        discountType: "fixed",
        discountValue: 50000, // 500.00 руб
        minOrderAmount: 200000, // 2 000.00 руб
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2027-12-31"),
      });

      const err = validPromo.validateSync();
      expect(err).toBeUndefined();
      expect(validPromo.isActive).toBe(true);
    });
  });

  describe("Review Model", () => {
    it("validates rating to be between 1 and 5", () => {
      const invalidReview = new Review({
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        rating: 6, // Invalid
        comment: "Супер!",
      });

      const err = invalidReview.validateSync();
      expect(err?.errors["rating"]).toBeDefined();
    });

    it("passes validation for rating within range 1 to 5", () => {
      const validReview = new Review({
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        rating: 5,
        comment: "Отличный товар, быстрая доставка!",
      });

      const err = validReview.validateSync();
      expect(err).toBeUndefined();
      expect(validReview.isApproved).toBe(false);
    });
  });

  describe("Order Model", () => {
    it("fails validation if items array is empty", () => {
      const invalidOrder = new Order({
        number: "KB-99999",
        contact: { fullName: "Иван Иванов", phone: "+79991234567", email: "ivan@test.ru" },
        shippingAddress: { city: "Москва", street: "Ленина", house: "1", postalCode: "101000" },
        delivery: { title: "Курьер", price: 35000 },
        items: [],
        totalAmount: 0,
        finalAmount: 35000,
        paymentMethod: "card_online",
      });

      const err = invalidOrder.validateSync();
      expect(err?.errors["items"]).toBeDefined();
    });

    it("passes validation for valid order with snapshots", () => {
      const validOrder = new Order({
        number: "KB-10001",
        userId: new mongoose.Types.ObjectId(),
        contact: { fullName: "Петр Петров", phone: "+79997654321", email: "petr@test.ru" },
        shippingAddress: { city: "Санкт-Петербург", street: "Невский", house: "10", postalCode: "190000" },
        delivery: { methodId: new mongoose.Types.ObjectId(), title: "Курьер", price: 35000 },
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            sku: "TEST-SKU-1",
            title: "Товар 1",
            quantity: 2,
            pricePerUnit: 100000,
            totalPrice: 200000,
          },
        ],
        totalAmount: 200000,
        discountAmount: 0,
        deliveryCost: 35000,
        finalAmount: 235000,
        paymentMethod: "card_online",
      });

      const err = validOrder.validateSync();
      expect(err).toBeUndefined();
      expect(validOrder.status).toBe("new");
    });
  });
});
