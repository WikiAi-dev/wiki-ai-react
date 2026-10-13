"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useTheme } from "next-themes"
import { Plus, Trash2 } from "lucide-react"
import type { ScenarioEdge, ScenarioNode } from "@/lib/telephony"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type StepData = { title: string; description: string }
type StepNode = Node<StepData, "step">

function StepCard({ data, selected }: NodeProps<StepNode>) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        "w-56 rounded-xl border bg-card px-3 py-2.5 text-left shadow-sm transition-colors",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border",
      )}
    >
      <Handle type="target" position={Position.Top} className="!size-3 !border-2 !border-background !bg-primary" />
      <p className="truncate text-sm font-medium text-foreground">{data.title || t("telephony.assistants.map.untitled")}</p>
      {data.description && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{data.description}</p>}
      <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-background !bg-primary" />
    </div>
  )
}

const nodeTypes = { step: StepCard }

const edgeLook = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
  labelBgPadding: [6, 3] as [number, number],
  labelBgBorderRadius: 6,
  labelStyle: { fontSize: 12 },
}

function toFlow(nodes: ScenarioNode[], edges: ScenarioEdge[]): { nodes: StepNode[]; edges: Edge[] } {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: "step", position: { x: n.x, y: n.y }, data: { title: n.title, description: n.description } })),
    edges: edges.map((e) => ({ id: e.id, source: e.from, target: e.to, label: e.label || undefined, ...edgeLook })),
  }
}

function fromFlow(nodes: StepNode[], edges: Edge[]): { nodes: ScenarioNode[]; edges: ScenarioEdge[] } {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.data.title,
      description: n.data.description,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    })),
    edges: edges.map((e) => ({ id: e.id, from: e.source, to: e.target, label: typeof e.label === "string" ? e.label : "" })),
  }
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * The conversation map: steps the assistant goes through (cards with a
 * title and what to do there) joined by transitions (arrows with the
 * condition). The map owns its state; the parent hears every change in
 * the scenario draft's shape. Mount it with a key per scenario.
 */
export function ScenarioMap({
  nodes: initialNodes,
  edges: initialEdges,
  onChange,
  disabled,
}: {
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  onChange: (nodes: ScenarioNode[], edges: ScenarioEdge[]) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const [initial] = useState(() => toFlow(initialNodes, initialEdges))
  const [nodes, setNodes] = useState<StepNode[]>(initial.nodes)
  const [edges, setEdges] = useState<Edge[]>(initial.edges)

  // Moving a card or React Flow measuring one changes nodes without
  // changing the scenario: only real changes reach the parent.
  const emitted = useRef(JSON.stringify(fromFlow(initial.nodes, initial.edges)))
  useEffect(() => {
    const next = fromFlow(nodes, edges)
    const key = JSON.stringify(next)
    if (key === emitted.current) return
    emitted.current = key
    onChange(next.nodes, next.edges)
  }, [nodes, edges, onChange])

  const onNodesChange = useCallback((changes: NodeChange<StepNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)), [])
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return
      setEdges((es) => (es.some((e) => e.source === c.source && e.target === c.target) ? es : addEdge({ ...c, id: newId("edge"), ...edgeLook }, es)))
    },
    [],
  )

  const selectedNode = nodes.find((n) => n.selected)
  const selectedEdge = selectedNode ? undefined : edges.find((e) => e.selected)

  const addStep = () => {
    const lowest = nodes.reduce((m, n) => Math.max(m, n.position.y), -140)
    const left = nodes.length ? Math.min(...nodes.map((n) => n.position.x)) : 0
    const id = newId("step")
    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      { id, type: "step", position: { x: left, y: lowest + 140 }, data: { title: t("telephony.assistants.map.newStep"), description: "" }, selected: true },
    ])
    setEdges((es) => es.map((e) => ({ ...e, selected: false })))
  }

  const editNode = (patch: Partial<StepData>) =>
    setNodes((ns) => ns.map((n) => (n.id === selectedNode?.id ? { ...n, data: { ...n.data, ...patch } } : n)))
  const removeNode = () => {
    const id = selectedNode?.id
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id))
  }
  const editEdge = (label: string) => setEdges((es) => es.map((e) => (e.id === selectedEdge?.id ? { ...e, label: label || undefined } : e)))
  const removeEdge = () => setEdges((es) => es.filter((e) => e.id !== selectedEdge?.id))
  const title = (id: string) => nodes.find((n) => n.id === id)?.data.title ?? ""

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="relative h-[440px] overflow-hidden rounded-2xl border border-border bg-muted/30 lg:h-[560px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          nodesDraggable={!disabled}
          nodesConnectable={!disabled}
          elementsSelectable={!disabled}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          minZoom={0.3}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <Button type="button" size="sm" className="absolute right-3 top-3 z-10 shadow-sm" onClick={addStep} disabled={disabled}>
          <Plus />
          {t("telephony.assistants.map.addStep")}
        </Button>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-4">
        {selectedNode ? (
          <div className="grid gap-3">
            <p className="text-sm font-medium text-foreground">{t("telephony.assistants.map.step")}</p>
            <div className="grid gap-1.5">
              <Label htmlFor="step-title">{t("telephony.assistants.map.title")}</Label>
              <Input id="step-title" value={selectedNode.data.title} onChange={(e) => editNode({ title: e.target.value })} maxLength={120} disabled={disabled} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="step-description">{t("telephony.assistants.map.description")}</Label>
              <Textarea
                id="step-description"
                value={selectedNode.data.description}
                onChange={(e) => editNode({ description: e.target.value })}
                placeholder={t("telephony.assistants.map.descriptionPlaceholder")}
                className="min-h-32"
                maxLength={2000}
                disabled={disabled}
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="justify-self-start text-destructive" onClick={removeNode} disabled={disabled}>
              <Trash2 />
              {t("telephony.assistants.map.removeStep")}
            </Button>
          </div>
        ) : selectedEdge ? (
          <div className="grid gap-3">
            <p className="text-sm font-medium text-foreground">{t("telephony.assistants.map.transition")}</p>
            <p className="text-[13px] text-muted-foreground">
              «{title(selectedEdge.source)}» → «{title(selectedEdge.target)}»
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="edge-label">{t("telephony.assistants.map.condition")}</Label>
              <Input
                id="edge-label"
                value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                onChange={(e) => editEdge(e.target.value)}
                placeholder={t("telephony.assistants.map.conditionPlaceholder")}
                maxLength={200}
                disabled={disabled}
              />
              <p className="text-[13px] text-muted-foreground">{t("telephony.assistants.map.conditionHelp")}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="justify-self-start text-destructive" onClick={removeEdge} disabled={disabled}>
              <Trash2 />
              {t("telephony.assistants.map.removeTransition")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 text-[13px] leading-relaxed text-muted-foreground">
            <p className="text-sm font-medium text-foreground">{t("telephony.assistants.map.howTitle")}</p>
            <p>{t("telephony.assistants.map.howSelect")}</p>
            <p>{t("telephony.assistants.map.howConnect")}</p>
            <p>{t("telephony.assistants.map.howOrder")}</p>
          </div>
        )}
      </aside>
    </div>
  )
}
