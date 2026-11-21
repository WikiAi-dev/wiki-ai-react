import { describe, expect, it } from "vitest"
import { apiText, callSeconds, formatDuration, formatPhone } from "./telephony"

describe("formatPhone", () => {
  it("masks Belarusian numbers", () => {
    expect(formatPhone("+375291234567")).toBe("+375 29 123-45-67")
  })
  it("masks Russian numbers", () => {
    expect(formatPhone("+79123456789")).toBe("+7 912 345-67-89")
  })
  it("passes through anything else", () => {
    expect(formatPhone("+4930123456")).toBe("+4930123456")
    expect(formatPhone("+37529123")).toBe("+37529123")
    expect(formatPhone("anonymous")).toBe("anonymous")
  })
  it("is empty for an empty number", () => {
    expect(formatPhone("")).toBe("")
  })
})

describe("formatDuration", () => {
  it("is m:ss under an hour", () => {
    expect(formatDuration(0)).toBe("0:00")
    expect(formatDuration(5)).toBe("0:05")
    expect(formatDuration(65)).toBe("1:05")
    expect(formatDuration(3599)).toBe("59:59")
  })
  it("is h:mm:ss from an hour", () => {
    expect(formatDuration(3600)).toBe("1:00:00")
    expect(formatDuration(3723)).toBe("1:02:03")
  })
  it("rounds and is safe for negative numbers", () => {
    expect(formatDuration(59.6)).toBe("1:00")
    expect(formatDuration(-5)).toBe("0:00")
  })
  it("is safe for NaN", () => {
    expect(formatDuration(Number.NaN)).toBe("0:00")
  })
})

describe("callSeconds", () => {
  const base = { started_at: "2026-11-21T10:00:00Z", answered_at: null, ended_at: null, duration_s: 0 }
  it("prefers the reported duration", () => {
    expect(callSeconds({ ...base, duration_s: 42, ended_at: "2026-11-21T10:10:00Z" })).toBe(42)
  })
  it("counts from the answer when there is one", () => {
    expect(callSeconds({ ...base, answered_at: "2026-11-21T10:00:10Z", ended_at: "2026-11-21T10:01:10Z" })).toBe(60)
  })
  it("counts the whole call when nobody answered", () => {
    expect(callSeconds({ ...base, ended_at: "2026-11-21T10:00:30Z" })).toBe(30)
  })
  it("is 0 for a call that has not ended", () => {
    expect(callSeconds(base)).toBe(0)
  })
  it("is never negative", () => {
    expect(callSeconds({ ...base, ended_at: "2026-11-21T09:00:00Z" })).toBe(0)
  })
})

describe("apiText", () => {
  it("translates a known message in Russian", () => {
    expect(apiText("Choose a trunk", "ru")).toBe("Выберите транк")
  })
  it("translates the taken-number message, old and new", () => {
    expect(apiText("This number is unavailable", "ru")).toBe("Этот номер недоступен")
    expect(apiText("This number is already used by a line", "ru")).toBe("Этот номер уже занят другой линией")
  })
  it("leaves it in English otherwise", () => {
    expect(apiText("Choose a trunk", "en")).toBe("Choose a trunk")
  })
  it("falls back to the message when it is unknown", () => {
    expect(apiText("Totally new error", "ru")).toBe("Totally new error")
  })
  it("is empty for no message", () => {
    expect(apiText(undefined, "ru")).toBe("")
    expect(apiText("", "ru")).toBe("")
  })
})
