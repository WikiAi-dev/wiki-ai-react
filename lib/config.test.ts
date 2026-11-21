import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

async function load() {
  vi.resetModules()
  return import("./config")
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_WS_URL", "")
  vi.stubEnv("NEXT_PUBLIC_API_URL", "")
})
afterEach(() => vi.unstubAllEnvs())

describe("lib/config", () => {
  it("defaults the WebSocket URL to the local voice engine", async () => {
    const { API_CONFIG, getWsUrl } = await load()
    expect(API_CONFIG.WS_URL).toBe("ws://localhost:9001")
    expect(getWsUrl("/v1/telephony/live/calls/1/events")).toBe("ws://localhost:9001/v1/telephony/live/calls/1/events")
  })

  it("uses NEXT_PUBLIC_WS_URL without its trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://api.example.test/")
    const { API_CONFIG, getWsUrl } = await load()
    expect(API_CONFIG.WS_URL).toBe("wss://api.example.test")
    expect(getWsUrl("/ws")).toBe("wss://api.example.test/ws")
    expect(getWsUrl()).toBe("wss://api.example.test/ws")
  })

  it("keeps HTTP requests same-origin unless NEXT_PUBLIC_API_URL is set", async () => {
    let { getApiUrl } = await load()
    expect(getApiUrl("/v1/me")).toBe("/v1/me")
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/")
    ;({ getApiUrl } = await load())
    expect(getApiUrl("/v1/me")).toBe("https://api.example.test/v1/me")
  })
})
