export interface Workflow {
  id: string
  name: string
  active: boolean
  nodes: number
  updatedAt: string
}

export interface WorkflowDetail {
  id: string
  name: string
  nodes: NodeData[]
  connections: Record<string, unknown>
  settings: Record<string, unknown>
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface NodeData {
  id: string
  name: string
  type: string
  parameters: Record<string, unknown>
  credentials?: Record<string, unknown>
  position: [number, number]
}

export interface SearchResult {
  nodeName: string
  nodeType: string
  nodeId: string
  matches: SearchMatch[]
}

export interface SearchMatch {
  field: string
  expression: string
  fullValue: string
  context: string
  matchIndex: number
}
