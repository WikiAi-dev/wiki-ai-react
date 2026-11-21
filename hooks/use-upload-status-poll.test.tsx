// @vitest-environment jsdom
import { createElement, act, useEffect, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getStatus = vi.fn()
vi.mock("@/lib/api", () => ({ filesApi: { getStatus: (...args: unknown[]) => getStatus(...args) } }))

import { useUploadStatusPoll, type UploadStatusEntry } from "./use-upload-status-poll"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let hook: ReturnType<typeof useUploadStatusPoll>

function Probe(): ReactNode {
  const value = useUploadStatusPoll("tok")
  useEffect(() => {
    hook = value
  })
  return null
}

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

const track = (entries: UploadStatusEntry[]) =>
  act(async () => {
    hook.track(entries)
  })

const ok = (status: string) => ({ status: "success", response: { document_id: "x", status, chunk_count: 0, updated_at: "" } })

beforeEach(async () => {
  vi.useFakeTimers()
  getStatus.mockReset()
  root = createRoot(document.createElement("div"))
  await act(async () => {
    root.render(createElement(Probe))
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.useRealTimers()
})

describe("useUploadStatusPoll", () => {
  it("polls every 5 s and stops at a terminal status", async () => {
    getStatus.mockResolvedValueOnce(ok("pending")).mockResolvedValueOnce(ok("indexing")).mockResolvedValue(ok("indexed"))
    await track([{ filename: "a.md", documentId: "a", status: "pending" }])

    await tick(4_999)
    expect(getStatus).toHaveBeenCalledTimes(0)
    await tick(1)
    expect(getStatus).toHaveBeenCalledTimes(1)
    await tick(5_000)
    expect(hook.entries[0].status).toBe("indexing")
    await tick(5_000)
    expect(hook.entries[0].status).toBe("indexed")
    expect(getStatus).toHaveBeenCalledTimes(3)

    await tick(60_000)
    expect(getStatus).toHaveBeenCalledTimes(3)
  })

  it.each(["failed", "duplicate"])("stops at %s", async (status) => {
    getStatus.mockResolvedValue(ok(status))
    await track([{ filename: "a.md", documentId: "a", status: "pending" }])
    await tick(5_000)
    expect(hook.entries[0].status).toBe(status)
    await tick(30_000)
    expect(getStatus).toHaveBeenCalledTimes(1)
  })

  it("does not poll entries that are already terminal or have no document id", async () => {
    getStatus.mockResolvedValue(ok("indexed"))
    await track([
      { filename: "done.md", documentId: "d", status: "indexed" },
      { filename: "dup.md", documentId: "e", status: "duplicate" },
      { filename: "bad.md", documentId: "f", status: "error" },
      { filename: "none.md", status: "pending" },
    ])
    await tick(30_000)
    expect(getStatus).not.toHaveBeenCalled()
    expect(hook.entries).toHaveLength(4)
  })

  it("tracks the same document id once", async () => {
    getStatus.mockResolvedValue(ok("pending"))
    await track([{ filename: "a.md", documentId: "a", status: "pending" }])
    await track([{ filename: "a.md", documentId: "a", status: "pending" }])
    await tick(5_000)
    expect(getStatus).toHaveBeenCalledTimes(1)
  })

  it("clears every interval on unmount", async () => {
    getStatus.mockResolvedValue(ok("pending"))
    await track([
      { filename: "a.md", documentId: "a", status: "pending" },
      { filename: "b.md", documentId: "b", status: "pending" },
    ])
    expect(vi.getTimerCount()).toBe(2)
    await act(async () => root.unmount())
    expect(vi.getTimerCount()).toBe(0)
    // afterEach unmounts again: render a fresh root for it.
    root = createRoot(document.createElement("div"))
  })

  it("stops polling a document whose status keeps failing (E13)", async () => {
    getStatus.mockResolvedValue({ status: "error", message: "Not found", httpStatus: 404 })
    await track([{ filename: "gone.md", documentId: "g", status: "pending" }])
    await tick(5_000 * 20)
    expect(getStatus.mock.calls.length).toBeLessThanOrEqual(6)
    expect(hook.entries[0].status).toBe("error")
    expect(hook.entries[0].message).toBe("Not found")
    expect(vi.getTimerCount()).toBe(0)
  })

  it("keeps polling through a few failures and resets the count on success", async () => {
    getStatus
      .mockResolvedValueOnce({ status: "error", message: "502" })
      .mockResolvedValueOnce({ status: "error", message: "502" })
      .mockResolvedValueOnce(ok("indexing"))
      .mockResolvedValue(ok("indexed"))
    await track([{ filename: "a.md", documentId: "a", status: "pending" }])
    await tick(5_000 * 4)
    expect(hook.entries[0].status).toBe("indexed")
  })

  it("dismiss stops that document's polling and removes it", async () => {
    getStatus.mockResolvedValue(ok("pending"))
    await track([{ filename: "a.md", documentId: "a", status: "pending" }])
    await act(async () => hook.dismiss("a"))
    expect(hook.entries).toHaveLength(0)
    await tick(30_000)
    expect(getStatus).not.toHaveBeenCalled()
  })
})
