import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      include: ["assets/scripts/domain/**/*.ts", "cloudfunctions/shared/**/*.ts"],
    },
  },
});
