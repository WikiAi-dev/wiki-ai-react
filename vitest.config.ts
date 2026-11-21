import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["lib/**/*.test.{ts,tsx}", "hooks/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
    environment: "node",
  },
})
