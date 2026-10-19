import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:27017/online-shop-test?replicaSet=rs0",
      BETTER_AUTH_SECRET: "test_secret_for_vitest_unit_testing_32_chars_min",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
