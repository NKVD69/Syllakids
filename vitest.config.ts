import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["packages/**/test/**/*.test.ts", "content/**/*.test.ts", "apps/app/src/**/*.test.ts"] },
});
