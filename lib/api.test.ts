import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest, filesApi } from "./api"
import { mockFetch, type Answer, type SentRequest } from "./test-fetch"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("apiRequest logging (E8)", () => {
  it("never writes response bodies (tokens, keys, document text) to the console", async () => {
    mockFetch(() => ({
      body: { access_token: "SECRET-ACCESS", refresh_token: "SECRET-REFRESH", full_key: "SECRET-KEY", content: "SECRET-DOC" },
    }))
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}))

    const res = await apiRequest({ url: "/v1/auth/login", method: "POST", data: { username: "u", password: "p" } })
    expect(res.status).toBe("success")

    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls))
    expect(logged).not.toContain("SECRET")
  })

  it("does not log the text of a non-JSON error body either", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>SECRET-PAGE token=SECRET</html>", { status: 502 })),
    )
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}))

    const res = await apiRequest({ url: "/v1/anything", token: "t" })
    expect(res.status).toBe("error")
    expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toContain("SECRET")
  })
})

describe("filesApi.reindex (E1)", () => {
  const doc = { document: { content: "# Price list", title: "price.md", doc_type: "text/markdown", metadata: { source: "connector" } } }
  let answers: { post: Answer; del: Answer }

  const route = (req: SentRequest): Answer => {
    if (req.url.startsWith("/v1/token/validate")) return { body: { valid: true, organization_id: "tenant-1" } }
    if (req.method === "GET" && req.url.startsWith("/v1/documents/X")) return { body: doc }
    if (req.method === "POST" && req.url.startsWith("/v1/documents")) return answers.post
    if (req.method === "DELETE") return answers.del
    return { status: 500 }
  }
  const deletes = (calls: SentRequest[]) => calls.filter((c) => c.method === "DELETE")

  beforeEach(() => {
    answers = { post: { body: { document_id: "X", status: "duplicate" } }, del: { body: {} } }
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("does not delete anything when ingest dedups to the same document (status duplicate)", async () => {
    const { calls } = mockFetch(route)
    const res = await filesApi.reindex("tok", "X")
    expect(deletes(calls)).toHaveLength(0)
    expect(res.status).toBe("success")
    expect(res.response?.unchanged).toBe(true)
  })

  it.each(["pending", "indexing"])("does not delete when ingest points back at the same in-flight document (%s)", async (status) => {
    answers.post = { body: { document_id: "X", status } }
    const { calls } = mockFetch(route)
    const res = await filesApi.reindex("tok", "X")
    expect(deletes(calls)).toHaveLength(0)
    expect(res.response?.unchanged).toBe(true)
  })

  it("does not delete when ingest answers with another document that is already indexed", async () => {
    answers.post = { body: { document_id: "Z", status: "duplicate" } }
    const { calls } = mockFetch(route)
    await filesApi.reindex("tok", "X")
    expect(deletes(calls)).toHaveLength(0)
  })

  it("deletes the old document exactly once when ingest made a new one", async () => {
    answers.post = { body: { document_id: "Y", status: "pending" } }
    const { calls } = mockFetch(route)
    const res = await filesApi.reindex("tok", "X")
    expect(deletes(calls)).toHaveLength(1)
    expect(deletes(calls)[0].url).toContain("/v1/documents/X")
    expect(res.status).toBe("success")
    expect(res.response?.document_id).toBe("Y")
  })

  it("re-ingests the stored title, type and metadata", async () => {
    answers.post = { body: { document_id: "Y", status: "pending" } }
    const { calls } = mockFetch(route)
    await filesApi.reindex("tok", "X")
    const post = calls.find((c) => c.method === "POST" && c.url.startsWith("/v1/documents"))
    expect(post?.body).toMatchObject({
      tenant_id: "tenant-1",
      title: "price.md",
      content: "# Price list",
      doc_type: "text/markdown",
      metadata: { source: "connector" },
    })
  })

  it("reports an error and ingests nothing when the document has no content", async () => {
    const { calls } = mockFetch((req) =>
      req.method === "GET" && req.url.startsWith("/v1/documents/X") ? { body: { document: { content: "", title: "empty" } } } : route(req),
    )
    const res = await filesApi.reindex("tok", "X")
    expect(res.status).toBe("error")
    expect(calls.some((c) => c.method === "POST" && c.url.startsWith("/v1/documents"))).toBe(false)
    expect(deletes(calls)).toHaveLength(0)
  })

  it("returns the 'failed to remove old' error when the delete fails after a successful ingest", async () => {
    answers.post = { body: { document_id: "Y", status: "pending" } }
    answers.del = { status: 500, body: { error: { message: "boom" } } }
    const { calls } = mockFetch(route)
    const res = await filesApi.reindex("tok", "X")
    expect(res.status).toBe("error")
    expect(res.message).toContain("failed to remove the old document")
    expect(res.message).toContain("boom")
    // The new document is not rolled back.
    expect(deletes(calls)).toHaveLength(1)
  })

  it("treats a 404 on the delete as success (ingest already cleared a failed document)", async () => {
    answers.post = { body: { document_id: "Y", status: "pending" } }
    answers.del = { status: 404, body: { error: { message: "not found" } } }
    mockFetch(route)
    const res = await filesApi.reindex("tok", "X")
    expect(res.status).toBe("success")
  })
})

describe("filesApi.getContent id resolution", () => {
  const UUID = "3f2b8c1e-9d4a-4c6b-8a7e-1b2c3d4e5f60"
  const list = {
    documents: [
      { document_id: "id-ru", title: "ПРАЙС КОМПАНИИ.md" },
      { document_id: "id-nfd", title: "Café.md" },
    ],
  }
  const route = (req: SentRequest): Answer => {
    if (req.url.startsWith("/v1/token/validate")) return { body: { valid: true, organization_id: "t" } }
    const m = /^\/v1\/documents\/([^?]+)/.exec(req.url)
    if (m) return { body: { document: { content: `content of ${decodeURIComponent(m[1])}` } } }
    if (req.url.startsWith("/v1/documents")) return { body: list }
    return { status: 500 }
  }
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("passes a UUID straight through without listing documents", async () => {
    const { calls } = mockFetch(route)
    const res = await filesApi.getContent("tok", UUID)
    expect(res.status).toBe("success")
    expect(calls.some((c) => c.url.startsWith("/v1/documents?"))).toBe(false)
    expect(calls.some((c) => c.url.startsWith(`/v1/documents/${UUID}`))).toBe(true)
  })

  it("resolves a Cyrillic title case-insensitively", async () => {
    mockFetch(route)
    const res = await filesApi.getContent("tok", "прайс компании.MD")
    expect(res.status).toBe("success")
    expect((res as { response?: { content: string } }).response?.content).toBe("content of id-ru")
  })

  it("resolves a title typed in NFD against a stored NFC one", async () => {
    mockFetch(route)
    const res = await filesApi.getContent("tok", "Café.md".normalize("NFD"))
    expect(res.status).toBe("success")
  })

  it("reports an error for a title that matches nothing", async () => {
    mockFetch(route)
    const res = await filesApi.getContent("tok", "missing.md")
    expect(res.status).toBe("error")
  })
})
