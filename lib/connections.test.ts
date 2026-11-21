import { describe, expect, it } from "vitest"
import { documentSource, fullTime, relativeTime } from "./connections"

describe("documentSource", () => {
  it("is null for null, non-objects and documents without source=connector", () => {
    expect(documentSource(null)).toBeNull()
    expect(documentSource(undefined)).toBeNull()
    expect(documentSource("connector")).toBeNull()
    expect(documentSource(42)).toBeNull()
    expect(documentSource({})).toBeNull()
    expect(documentSource({ source: "upload", provider: "jira" })).toBeNull()
  })

  it("reads what connector-service stores", () => {
    expect(
      documentSource({
        source: "connector",
        provider: "jira",
        provider_title: "Jira Cloud",
        kind: "issue",
        kind_title: "Issues",
        connection_name: "Main",
        source_url: "https://jira.example/WAI-1",
        source_updated_at: "2026-11-01T10:00:00Z",
      }),
    ).toEqual({
      provider: "jira",
      providerTitle: "Jira Cloud",
      kind: "issue",
      kindTitle: "Issues",
      connectionName: "Main",
      url: "https://jira.example/WAI-1",
      updatedAt: "2026-11-01T10:00:00Z",
    })
  })

  it("reads go-core's legacy connector_type / connector_name fields", () => {
    const s = documentSource({ source: "connector", connector_type: "bitrix24", connector_name: "Portal" })
    expect(s?.provider).toBe("bitrix24")
    expect(s?.connectionName).toBe("Portal")
    expect(s?.providerTitle).toBe("Bitrix24")
  })

  it("falls back to PROVIDER_TITLES, then to the provider id, when there is no provider_title", () => {
    expect(documentSource({ source: "connector", provider: "onec" })?.providerTitle).toBe("1C")
    expect(documentSource({ source: "connector", provider: "rest" })?.providerTitle).toBe("REST API")
    expect(documentSource({ source: "connector", provider: "mystery" })?.providerTitle).toBe("mystery")
  })

  it("uses the kind as its title and null for a missing update time", () => {
    const s = documentSource({ source: "connector", provider: "jira", kind: "issue" })
    expect(s?.kindTitle).toBe("issue")
    expect(s?.updatedAt).toBeNull()
    expect(s?.url).toBe("")
  })

  it("ignores non-string field values", () => {
    const s = documentSource({ source: "connector", provider: 7, kind: { a: 1 } })
    expect(s?.provider).toBe("")
    expect(s?.kind).toBe("")
  })
})

describe("relativeTime", () => {
  const now = Date.parse("2026-11-21T12:00:00Z")
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString()

  it("is empty for empty and invalid dates", () => {
    expect(relativeTime(null, "en", now)).toBe("")
    expect(relativeTime(undefined, "en", now)).toBe("")
    expect(relativeTime("", "en", now)).toBe("")
    expect(relativeTime("not a date", "en", now)).toBe("")
  })

  it("buckets at 45 s, 45 min, 22 h and 26 d (English)", () => {
    expect(relativeTime(ago(44), "en", now)).toBe("now")
    expect(relativeTime(ago(45), "en", now)).toBe("1 minute ago")
    expect(relativeTime(ago(45 * 60 - 1), "en", now)).toBe("45 minutes ago")
    expect(relativeTime(ago(45 * 60), "en", now)).toBe("1 hour ago")
    expect(relativeTime(ago(22 * 3600 - 1), "en", now)).toBe("22 hours ago")
    expect(relativeTime(ago(22 * 3600), "en", now)).toBe("yesterday")
    expect(relativeTime(ago(26 * 86400 - 1), "en", now)).toBe("26 days ago")
    // Past 26 days: a calendar date.
    expect(relativeTime(ago(26 * 86400), "en", now)).toMatch(/\d{4}/)
  })

  it("speaks the app's language", () => {
    expect(relativeTime(ago(5 * 60), "ru", now)).toBe("5 минут назад")
    expect(relativeTime(ago(5 * 60), "en", now)).toBe("5 minutes ago")
    // Anything but "ru" is English.
    expect(relativeTime(ago(5 * 60), "de", now)).toBe("5 minutes ago")
  })

  it("handles the future", () => {
    expect(relativeTime(new Date(now + 3 * 3600 * 1000).toISOString(), "en", now)).toBe("in 3 hours")
  })

  it("defaults 'now' to the clock", () => {
    expect(relativeTime(new Date().toISOString(), "en")).toBe("now")
  })
})

describe("fullTime", () => {
  it("is empty for empty and invalid dates", () => {
    expect(fullTime(null, "en")).toBe("")
    expect(fullTime("nope", "ru")).toBe("")
  })

  it("formats with the locale's month names", () => {
    const iso = "2026-11-21T12:00:00Z"
    expect(fullTime(iso, "en")).toMatch(/Nov/)
    expect(fullTime(iso, "ru")).toMatch(/ноя/)
    expect(fullTime(iso, "en")).toMatch(/2026/)
  })
})
