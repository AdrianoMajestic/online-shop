import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCategoriesHandler } from "@/app/api/categories/route";
import { GET as getProductsHandler } from "@/app/api/products/route";
import { GET as getProductBySlugHandler } from "@/app/api/products/[slug]/route";
import * as catalogService from "@/services/catalog.service";
import { IProduct } from "@/models/Product";
import * as dbModule from "@/lib/db";
import mongoose from "mongoose";
import { NotFoundError } from "@/lib/errors";

describe("Catalog Route Handlers API (T03)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
  });

  describe("GET /api/categories", () => {
    it("returns category hierarchy tree", async () => {
      const mockTree: catalogService.CategoryTreeNode[] = [
        {
          _id: "cat1",
          title: "Электроника",
          slug: "elektronika",
          description: "Тест",
          isVisible: true,
          sortOrder: 1,
          parentId: null,
          children: [
            {
              _id: "cat2",
              title: "Смартфоны",
              slug: "smartfony",
              description: "Подкатегория",
              isVisible: true,
              sortOrder: 1,
              parentId: "cat1",
              children: [],
            },
          ],
        },
      ];

      vi.spyOn(catalogService, "getCategoryTree").mockResolvedValue(mockTree);

      const res = await getCategoriesHandler();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual(mockTree);
      expect(data[0].children).toHaveLength(1);
    });
  });

  describe("GET /api/products", () => {
    it("returns paginated products list with filters", async () => {
      const mockResult: catalogService.PaginatedProductsResult = {
        items: [
          {
            _id: "prod1" as unknown as mongoose.Types.ObjectId,
            title: "Apple iPhone 15 Pro",
            slug: "apple-iphone-15-pro",
            sku: "KB-APL-IP15P-128",
            price: 11999000,
            discountPrice: 10999000,
            stockQuantity: 10,
            isPublished: true,
            ratingAvg: 4.9,
            reviewsCount: 15,
            salesCount: 40,
          } as unknown as IProduct,
        ],
        page: 1,
        limit: 20,
        total: 1,
      };

      vi.spyOn(catalogService, "getProducts").mockResolvedValue(mockResult);

      const req = new NextRequest("http://localhost:3000/api/products?category=smartfony&brand=apple&sort=popular&page=1&limit=20");
      const res = await getProductsHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.page).toBe(1);
      expect(data.total).toBe(1);
      expect(catalogService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "smartfony",
          brand: ["apple"],
          sort: "popular",
          page: 1,
          limit: 20,
        })
      );
    });

    it("returns 400 when invalid filter values are passed", async () => {
      const req = new NextRequest("http://localhost:3000/api/products?priceMin=5000&priceMax=1000");
      const res = await getProductsHandler(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/products/[slug]", () => {
    it("returns product details when slug exists", async () => {
      const mockProduct = {
        _id: "prod1" as unknown as mongoose.Types.ObjectId,
        title: "Apple iPhone 15 Pro",
        slug: "apple-iphone-15-pro",
        sku: "KB-APL-IP15P-128",
        price: 11999000,
      } as unknown as IProduct;

      vi.spyOn(catalogService, "getProductBySlug").mockResolvedValue(mockProduct);

      const req = new NextRequest("http://localhost:3000/api/products/apple-iphone-15-pro");
      const res = await getProductBySlugHandler(req, { params: { slug: "apple-iphone-15-pro" } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Apple iPhone 15 Pro");
      expect(data.slug).toBe("apple-iphone-15-pro");
    });

    it("returns 404 when product is not found", async () => {
      vi.spyOn(catalogService, "getProductBySlug").mockRejectedValue(
        new NotFoundError('Товар с slug "non-existing" не найден')
      );

      const req = new NextRequest("http://localhost:3000/api/products/non-existing");
      const res = await getProductBySlugHandler(req, { params: { slug: "non-existing" } });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });
});
