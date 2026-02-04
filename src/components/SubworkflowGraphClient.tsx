'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useConnections } from '@/src/hooks/useConnections'
import { useSubworkflowGraph } from '@/src/hooks/useSubworkflowGraph'
import { Button } from '@/src/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { RefreshCw, AlertTriangle, GitBranch, ArrowRight, ArrowLeft, ZoomIn, ZoomOut, Search, X, Info, ExternalLink } from 'lucide-react'
import { Badge } from '@/src/components/ui/badge'
import type { SubworkflowGraph } from '@/src/types/n8n'

// ── Layout constants ─────────────────────────────────────────────────────────

const NODE_WIDTH = 200
const NODE_HEIGHT = 72
const LAYER_GAP = 130
const NODE_GAP = 18
const CONTAINER_HEIGHT = 520

// ── Types ─────────────────────────────────────────────────────────────────────

interface LayoutNode {
  id: string
  position: { x: number; y: number }
  data: { label: string; active: boolean; isMissing: boolean; workflowId: string }
  role: 'caller' | 'selected' | 'callee'
}

interface LayoutEdge {
  id: string
  source: string
  target: string
}

// ── Focused layout ───────────────────────────────────────────────────────────
// Three columns: callers (left) → selected (center) → callees (right)
// All y-coordinates are 0-based; fit-transform handles centering in viewport.

function computeFocusedLayout(
  graph: SubworkflowGraph,
  selectedId: string
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const callerIds = [
    ...new Set(graph.edges.filter(e => e.targetId === selectedId && !e.isDynamic).map(e => e.callerId)),
  ]
  const calleeIds = [
    ...new Set(graph.edges.filter(e => e.callerId === selectedId && !e.isDynamic).map(e => e.targetId)),
  ]

  // Column x-positions (fixed, fit-transform will center them)
  const leftX = 0
  const centerX = NODE_WIDTH + LAYER_GAP
  const rightX = 2 * NODE_WIDTH + 2 * LAYER_GAP

  // Vertical extent of each column
  const colH = (count: number) => count * NODE_HEIGHT + Math.max(0, count - 1) * NODE_GAP
  const maxH = Math.max(colH(callerIds.length), colH(calleeIds.length), NODE_HEIGHT)

  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []

  // ── Center ──
  nodes.push({
    id: selectedId,
    position: { x: centerX, y: (maxH - NODE_HEIGHT) / 2 },
    data: {
      label: graph.workflows[selectedId]?.name ?? selectedId,
      active: graph.workflows[selectedId]?.active ?? false,
      isMissing: false,
      workflowId: selectedId,
    },
    role: 'selected',
  })

  // ── Left: callers ──
  const callerStartY = (maxH - colH(callerIds.length)) / 2
  callerIds.forEach((id, i) => {
    nodes.push({
      id,
      position: { x: leftX, y: callerStartY + i * (NODE_HEIGHT + NODE_GAP) },
      data: {
        label: graph.workflows[id]?.name ?? id,
        active: graph.workflows[id]?.active ?? false,
        isMissing: !graph.workflows[id],
        workflowId: id,
      },
      role: 'caller',
    })
    edges.push({ id: `${id}__${selectedId}`, source: id, target: selectedId })
  })

  // ── Right: callees ──
  const calleeStartY = (maxH - colH(calleeIds.length)) / 2
  calleeIds.forEach((id, i) => {
    nodes.push({
      id,
      position: { x: rightX, y: calleeStartY + i * (NODE_HEIGHT + NODE_GAP) },
      data: {
        label: graph.workflows[id]?.name ?? id,
        active: graph.workflows[id]?.active ?? false,
        isMissing: !graph.workflows[id],
        workflowId: id,
      },
      role: 'callee',
    })
    edges.push({ id: `${selectedId}__${id}`, source: selectedId, target: id })
  })

  return { nodes, edges }
}

// ── Bezier edge: right-edge of source → left-edge of target ─────────────────

function calcEdgePath(source: LayoutNode, target: LayoutNode): string {
  const x1 = source.position.x + NODE_WIDTH
  const y1 = source.position.y + NODE_HEIGHT / 2
  const x2 = target.position.x
  const y2 = target.position.y + NODE_HEIGHT / 2
  const cpx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SubworkflowGraphClient() {
  const { connections, activeConnection, loading: connectionsLoading } = useConnections()
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const { graph, loading, error, refresh } = useSubworkflowGraph(connectionId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(900)
  const [zoom, setZoom] = useState(1)
  const [modalWorkflowId, setModalWorkflowId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeConnection?.id && !connectionId) setConnectionId(activeConnection.id)
  }, [activeConnection, connectionId])

  // Reset zoom when selection changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setZoom(1) }, [selectedId])

  // Sync search input text when selectedId changes (e.g. via node click)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm(selectedId && graph ? (graph.workflows[selectedId]?.name ?? '') : '')
  }, [selectedId, graph])

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Workflow options: active first, then alphabetical
  const workflowOptions = useMemo(() => {
    if (!graph) return []
    return Object.values(graph.workflows).sort((a, b) => {
      if (a.active && !b.active) return -1
      if (!a.active && b.active) return 1
      return a.name.localeCompare(b.name)
    })
  }, [graph])

  // Filtered by current search input
  const filteredWorkflows = useMemo(() => {
    if (!searchTerm.trim()) return workflowOptions
    const lower = searchTerm.toLowerCase()
    return workflowOptions.filter(w => w.name.toLowerCase().includes(lower))
  }, [workflowOptions, searchTerm])

  // Layout (only depends on graph data, not container size)
  const { nodes, edges } = useMemo(() => {
    if (!graph || !selectedId) return { nodes: [], edges: [] }
    return computeFocusedLayout(graph, selectedId)
  }, [graph, selectedId])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  // Stats for the selected workflow
  const { callerCount, calleeCount, dynamicCalls } = useMemo(() => {
    if (!graph || !selectedId) return { callerCount: 0, calleeCount: 0, dynamicCalls: [] }
    const callers = new Set(graph.edges.filter(e => e.targetId === selectedId && !e.isDynamic).map(e => e.callerId))
    const callees = new Set(graph.edges.filter(e => e.callerId === selectedId && !e.isDynamic).map(e => e.targetId))
    const dynCalls = graph.edges.filter(e => e.callerId === selectedId && e.isDynamic)
    return { callerCount: callers.size, calleeCount: callees.size, dynamicCalls: dynCalls }
  }, [graph, selectedId])

  // Modal: full workflow details (works even for missing workflows)
  const modalData = useMemo(() => {
    if (!modalWorkflowId || !graph) return null
    const wf = graph.workflows[modalWorkflowId]
    const callers = [...new Set(graph.edges.filter(e => e.targetId === modalWorkflowId && !e.isDynamic).map(e => e.callerId))]
      .map(id => ({ id, name: graph.workflows[id]?.name ?? id }))
    const callees = [...new Set(graph.edges.filter(e => e.callerId === modalWorkflowId && !e.isDynamic).map(e => e.targetId))]
      .map(id => ({ id, name: graph.workflows[id]?.name ?? id }))
    const dynCount = graph.edges.filter(e => e.callerId === modalWorkflowId && e.isDynamic).length
    return {
      id: modalWorkflowId,
      name: wf?.name ?? modalWorkflowId,
      active: wf?.active ?? false,
      updatedAt: wf?.updatedAt ?? '',
      isMissing: !wf,
      callers,
      callees,
      dynCount,
    }
  }, [modalWorkflowId, graph])

  // Base URL of the currently selected n8n connection (for "Open in n8n" link)
  const n8nBaseUrl = useMemo(
    () => connections.find(c => c.id === connectionId)?.base_url?.replace(/\/+$/, ''),
    [connections, connectionId]
  )

  // Fit-to-viewport transform
  const { scale, translateX, translateY, svgW, svgH } = useMemo(() => {
    if (nodes.length === 0) return { scale: 1, translateX: 0, translateY: 0, svgW: 0, svgH: 0 }

    const xs = nodes.map(n => n.position.x)
    const ys = nodes.map(n => n.position.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs) + NODE_WIDTH
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys) + NODE_HEIGHT

    const graphW = maxX - minX
    const graphH = maxY - minY
    const pad = 32

    const fitScale = Math.min(
      (containerWidth - pad * 2) / graphW,
      (CONTAINER_HEIGHT - pad * 2) / graphH,
      1
    ) * zoom

    return {
      scale: fitScale,
      translateX: (containerWidth - graphW * fitScale) / 2 - minX * fitScale,
      translateY: (CONTAINER_HEIGHT - graphH * fitScale) / 2 - minY * fitScale,
      svgW: maxX,
      svgH: maxY,
    }
  }, [nodes, containerWidth, zoom])

  // ── SSR guard ──
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-card border border-border rounded-xl" />
        </div>
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subworkflow Graph</h1>
            <p className="text-muted-foreground">
              Pick a workflow — see what calls it and what it calls. Click any node to navigate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={refresh} disabled={loading || connectionsLoading || !connectionId}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Workflow selector row */}
        {!loading && graph && workflowOptions.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-80" ref={selectorRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); if (!e.target.value.trim()) setSelectedId(null) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search workflows…"
                className="w-full pl-9 pr-9 py-2.5 bg-background text-foreground border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors placeholder:text-muted-foreground"
              />
              {selectedId && (
                <button
                  onClick={() => { setSelectedId(null); setSearchTerm(''); setShowDropdown(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showDropdown && filteredWorkflows.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredWorkflows.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { setSelectedId(w.id); setSearchTerm(w.name); setShowDropdown(false) }}
                      className="w-full px-4 py-2.5 text-left hover:bg-accent flex items-center justify-between border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 shrink-0 rounded-full ${w.active ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-foreground truncate">{w.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${w.active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {w.active ? 'Active' : 'Off'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && filteredWorkflows.length === 0 && searchTerm.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-sm px-4 py-3">
                  <p className="text-sm text-muted-foreground">No workflows match &quot;{searchTerm}&quot;</p>
                </div>
              )}
            </div>

            {selectedId && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <ArrowLeft className="h-3 w-3 mr-1 text-indigo-500" />
                  {callerCount} caller{callerCount !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  <ArrowRight className="h-3 w-3 mr-1 text-indigo-500" />
                  {calleeCount} callee{calleeCount !== 1 ? 's' : ''}
                </Badge>
                {dynamicCalls.length > 0 && (
                  <Badge variant="outline">
                    <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                    {dynamicCalls.length} dynamic
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dynamic refs alert */}
        {selectedId && dynamicCalls.length > 0 && (
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              {dynamicCalls.length} call{dynamicCalls.length !== 1 ? 's' : ''} use expressions and cannot be resolved statically — not shown in graph.
            </AlertDescription>
          </Alert>
        )}

        {/* Graph card */}
        <div className="bg-card border border-border rounded-xl p-4">

          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

          {!loading && graph && workflowOptions.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No executeWorkflow nodes found for this connection.
            </div>
          )}

          {!loading && graph && !selectedId && workflowOptions.length > 0 && (
            <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
              <GitBranch className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-md">
                Select a workflow above to visualise its subworkflow dependencies.
              </p>
            </div>
          )}

          {!loading && selectedId && nodes.length > 0 && (
            <>
              {/* Column labels */}
              <div className="flex text-xs text-muted-foreground font-medium mb-2 px-1">
                <span className="flex-1 text-center" style={{ maxWidth: NODE_WIDTH }}>← Called by</span>
                <span className="flex-1 text-center">Selected</span>
                <span className="flex-1 text-center" style={{ maxWidth: NODE_WIDTH }}>Calls →</span>
              </div>

              {/* Graph viewport */}
              <div ref={containerRef} className="relative overflow-hidden" style={{ height: CONTAINER_HEIGHT }}>
                <div style={{
                  transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                  transformOrigin: '0 0',
                }}>
                  {/* SVG layer: edges */}
                  <svg
                    style={{ position: 'absolute', left: 0, top: 0, width: svgW, height: svgH, pointerEvents: 'none', overflow: 'visible' }}
                  >
                    <defs>
                      <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                      </marker>
                    </defs>
                    {edges.map(edge => {
                      const src = nodeMap.get(edge.source)
                      const tgt = nodeMap.get(edge.target)
                      if (!src || !tgt) return null
                      return (
                        <path
                          key={edge.id}
                          d={calcEdgePath(src, tgt)}
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="none"
                          markerEnd="url(#arrowhead)"
                        />
                      )
                    })}
                  </svg>

                  {/* Node layer */}
                  {nodes.map(node => (
                    <div
                      key={node.id}
                      className={`absolute group ${node.role !== 'selected' ? 'cursor-pointer' : ''}`}
                      style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
                      onClick={() => { if (node.role !== 'selected') setSelectedId(node.id) }}
                    >
                      <div className={`w-full h-full rounded-lg border-2 relative flex flex-col justify-between p-3 shadow-sm transition-all ${
                        node.role === 'selected'
                          ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-md'
                          : node.data.isMissing
                            ? 'bg-card border-red-400 hover:shadow-md'
                            : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                      }`}>
                        <span className="text-xs font-semibold text-foreground truncate leading-snug">
                          {node.data.label}
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <GitBranch className={`h-3 w-3 shrink-0 ${node.data.isMissing ? 'text-red-500' : 'text-muted-foreground'}`} />
                            <span className={`text-xs truncate ${node.data.isMissing ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {node.data.isMissing ? 'Missing' : node.data.workflowId}
                            </span>
                          </div>
                          <Badge variant={node.data.active ? 'default' : 'secondary'} className="text-xs shrink-0">
                            {node.data.active ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setModalWorkflowId(node.data.workflowId) }}
                          className={`absolute top-1.5 right-1.5 transition-opacity p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary ${node.role === 'selected' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls + legend */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z * 1.25))}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setZoom(1)}>Fit</Button>
                  <span className="text-xs text-muted-foreground ml-1">{Math.round(scale * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
                    Selected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-border bg-card" />
                    Related
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-red-400 bg-card" />
                    Missing
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Workflow detail modal ─────────────────────────────────────── */}
        {modalData && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setModalWorkflowId(null)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative z-10 bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setModalWorkflowId(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header: icon + name + status */}
              <div className="flex items-start gap-3 mb-4 pr-5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${modalData.active ? 'bg-green-500/10' : 'bg-muted'}`}>
                  <GitBranch className={`h-4 w-4 ${modalData.active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground leading-snug break-words">{modalData.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={modalData.active ? 'default' : 'secondary'} className="text-xs">
                      {modalData.active ? 'Active' : 'Inactive'}
                    </Badge>
                    {modalData.isMissing && (
                      <Badge variant="destructive" className="text-xs">Missing</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Key-value details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">ID</span>
                  <span className="font-mono text-foreground text-xs truncate">{modalData.id}</span>
                </div>
                {modalData.updatedAt && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Updated</span>
                    <span className="text-foreground">{new Date(modalData.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Called by</span>
                  <span className="text-foreground">{modalData.callers.length} workflow{modalData.callers.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Calls</span>
                  <span className="text-foreground">{modalData.callees.length} workflow{modalData.callees.length !== 1 ? 's' : ''}</span>
                </div>
                {modalData.dynCount > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Dynamic</span>
                    <span className="text-amber-600 dark:text-amber-400">{modalData.dynCount} unresolved</span>
                  </div>
                )}
              </div>

              {/* Caller chips */}
              {modalData.callers.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Called by</p>
                  <div className="flex flex-wrap gap-1.5">
                    {modalData.callers.map(c => (
                      <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Callee chips */}
              {modalData.callees.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Calls</p>
                  <div className="flex flex-wrap gap-1.5">
                    {modalData.callees.map(c => (
                      <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                {n8nBaseUrl && (
                  <a
                    href={`${n8nBaseUrl}/workflow/${modalData.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5"
                  >
                    Open in n8n <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => { setModalWorkflowId(null); setSelectedId(modalData.id) }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 ml-auto"
                >
                  <GitBranch className="h-3.5 w-3.5" /> View in graph
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
