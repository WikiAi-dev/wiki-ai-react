import { describe, expect, it } from "vitest"
import { selectionFromItems, selectionToItems, type KnowledgeSelection } from "./file-picker"
import type { ScopeItem } from "@/lib/telephony"

describe("knowledge selection <-> scope items", () => {
  it("splits items into documents and connections", () => {
    const items: ScopeItem[] = [
      { kind: "document", document_id: "d1" },
      { kind: "connection", connection_id: "c1" },
      { kind: "connection", connection_id: "c2", kinds: ["deal", "contact"] },
      { kind: "document", document_id: "d2" },
    ]
    expect(selectionFromItems(items)).toEqual({
      documents: ["d1", "d2"],
      connections: [
        { id: "c1", kinds: [] },
        { id: "c2", kinds: ["deal", "contact"] },
      ],
    })
  })

  it("drops items without an id", () => {
    expect(selectionFromItems([{ kind: "document" }, { kind: "connection" }])).toEqual({ documents: [], connections: [] })
  })

  it("round-trips, writing no kinds for a whole connection", () => {
    const selection: KnowledgeSelection = { documents: ["d1"], connections: [{ id: "c1", kinds: [] }, { id: "c2", kinds: ["deal"] }] }
    const items = selectionToItems(selection)
    expect(items).toEqual([
      { kind: "document", document_id: "d1" },
      { kind: "connection", connection_id: "c1" },
      { kind: "connection", connection_id: "c2", kinds: ["deal"] },
    ])
    expect(selectionFromItems(items)).toEqual(selection)
  })

  it("is empty both ways", () => {
    expect(selectionToItems({ documents: [], connections: [] })).toEqual([])
    expect(selectionFromItems([])).toEqual({ documents: [], connections: [] })
  })
})
