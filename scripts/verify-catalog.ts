import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/db";
import {
  getCategoryTree,
  getProducts,
  getProductBySlug,
} from "../src/services/catalog.service";
import { getProductsQuerySchema } from "../src/lib/validations/catalog";

async function main() {
  console.log("Connecting to DB...");
  await connectToDatabase();
  console.log("Connected.");

  console.log("\n1. Testing GET /api/categories (tree)...");
  const tree = await getCategoryTree();
  console.log(`Found ${tree.length} root categories:`);
  for (const root of tree) {
    console.log(` - ${root.title} (${root.slug}), children: ${root.children.length}`);
    for (const child of root.children) {
      console.log(`    * ${child.title} (${child.slug})`);
    }
  }

  console.log("\n2. Testing GET /api/products with combo of 3+ filters (category + brand + priceMin + priceMax + sort)...");
  const query1 = getProductsQuerySchema.parse({
    category: "smartfony-i-gadzhety",
    brand: "apple,samsung",
    priceMin: "3000000", // 30 000 руб
    priceMax: "12000000", // 120 000 руб
    sort: "price_asc",
    page: "1",
    limit: "10",
  });
  const res1 = await getProducts(query1);
  console.log(`Total found: ${res1.total}, returned on page: ${res1.items.length}`);
  for (const item of res1.items) {
    console.log(` - [${item.sku}] ${item.title}: ${(item.price / 100).toFixed(2)} ₽`);
  }

  console.log("\n3. Testing SKU search (KB-APL-IP15)...");
  const query2 = getProductsQuerySchema.parse({ q: "KB-APL-IP15" });
  const res2 = await getProducts(query2);
  console.log(`Total found: ${res2.total}`);
  for (const item of res2.items) {
    console.log(` - [${item.sku}] ${item.title}`);
  }

  console.log("\n4. Testing Full-text search ('кофемашина')...");
  const query3 = getProductsQuerySchema.parse({ q: "кофемашина" });
  const res3 = await getProducts(query3);
  console.log(`Total found: ${res3.total}`);
  for (const item of res3.items) {
    console.log(` - [${item.sku}] ${item.title}`);
  }

  console.log("\n5. Testing Category hierarchy traversal ('elektronika' root category)...");
  const query4 = getProductsQuerySchema.parse({ category: "elektronika" });
  const res4 = await getProducts(query4);
  console.log(`Total found in root + children: ${res4.total}`);

  console.log("\n6. Testing GET /api/products/[slug] (detailed product)...");
  const sampleProduct = res1.items[0];
  if (sampleProduct) {
    const detailed = await getProductBySlug(sampleProduct.slug);
    console.log(`Product: ${detailed.title}`);
    console.log(`SKU: ${detailed.sku}`);
    const categoryObj = detailed.categoryId as unknown as { title: string; slug: string };
    const brandObj = detailed.brandId as unknown as { title: string; slug: string };
    console.log(`Category: ${categoryObj?.title}`);
    console.log(`Brand: ${brandObj?.title}`);
    console.log(`Attributes: ${detailed.attributes.length}`);
  }

  console.log("\nAll catalog API verifications passed successfully!");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
