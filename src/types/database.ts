export interface N8nConnection {
  id: string
  user_id: string
  name: string
  base_url: string
  encrypted_api_key: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  user_id: string
  theme: 'light' | 'dark' | 'system'
  created_at: string
  updated_at: string
}

export interface WorkflowExecutionCache {
  id: string
  connection_id: string
  workflow_id: string
  workflow_name: string | null
  execution_time_ms: number | null
  executed_at: string
  status: 'success' | 'error' | 'waiting'
  created_at: string
}

export interface WorkflowDependency {
  id: string
  connection_id: string
  parent_workflow_id: string
  parent_workflow_name: string | null
  child_workflow_id: string
  child_workflow_name: string | null
  last_scanned_at: string
}
