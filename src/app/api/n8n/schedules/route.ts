import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/src/lib/auth-helpers'
import { resolveConnection } from '@/src/lib/n8n-connection'
import { fetchN8n } from '@/src/lib/n8n-client'
import { requireString } from '@/src/lib/validation'
import { rateLimit } from '@/src/lib/rate-limit'

type WorkflowListItem = {
  id: string
  name: string
  active: boolean
  updatedAt?: string
  nodes?: WorkflowNode[]
  isArchived?: boolean
}

type WorkflowNode = {
  id: string
  name: string
  type: string
  parameters?: Record<string, unknown>
}

type ScheduledWorkflow = {
  id: string
  name: string
  active: boolean
  nodes: number
  updatedAt?: string
  scheduleTriggers: ScheduleTriggerNode[]
}

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, 'n8n:schedules', { limit: 15, windowMs: 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const connectionId =
      body?.connectionId !== undefined
        ? requireString(body.connectionId, 'connectionId', { minLength: 1, trim: true })
        : null
    const timeZone =
      body?.timeZone !== undefined
        ? requireString(body.timeZone, 'timeZone', { minLength: 1, trim: true })
        : null
    const debug = body?.debug === true
    const devBypass =
      process.env.NODE_ENV === 'development' &&
      process.env.N8N_ALLOW_SCHEDULES_DEBUG === 'true'
    const baseUrl =
      body?.baseUrl !== undefined
        ? requireString(body.baseUrl, 'baseUrl', { minLength: 1, trim: true })
        : null
    const apiKey =
      body?.apiKey !== undefined
        ? requireString(body.apiKey, 'apiKey', { minLength: 1, trim: true })
        : null

    if (connectionId && !connectionId.ok) {
      return NextResponse.json({ success: false, error: connectionId.error }, { status: 400 })
    }
    if (timeZone && !timeZone.ok) {
      return NextResponse.json({ success: false, error: timeZone.error }, { status: 400 })
    }
    if (baseUrl && !baseUrl.ok) {
      return NextResponse.json({ success: false, error: baseUrl.error }, { status: 400 })
    }
    if (apiKey && !apiKey.ok) {
      return NextResponse.json({ success: false, error: apiKey.error }, { status: 400 })
    }

    let resolved: { ok: true; baseUrl: string; apiKey: string } | { ok: false; error: string; status: number }
    if (devBypass && baseUrl?.ok && apiKey?.ok) {
      resolved = { ok: true, baseUrl: baseUrl.value, apiKey: apiKey.value }
    } else {
      const { user, supabase } = await getAuthContext()
      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      const connectionResolved = await resolveConnection(
        supabase,
        user.id,
        connectionId ? connectionId.value : undefined
      )
      if (!connectionResolved.ok) {
        return NextResponse.json(
          { success: false, error: connectionResolved.error },
          { status: connectionResolved.status }
        )
      }
      resolved = connectionResolved
    }

    const workflows = await fetchAllWorkflows(resolved.baseUrl, resolved.apiKey)
    const { workflows: normalizedWorkflows, unparsedWorkflows } =
      await buildWorkflowsWithScheduleTriggers(
        workflows.filter((workflow) => workflow.active === true),
        resolved.baseUrl,
        resolved.apiKey
      )
    const scheduledWorkflows = normalizedWorkflows.filter(
      (workflow) => workflow.scheduleTriggers.length > 0
    )

    return NextResponse.json({
      success: true,
      data: {
        workflows: scheduledWorkflows,
        timeZone: timeZone?.ok ? timeZone.value : undefined,
        unparsedWorkflows,
      },
    })
  } catch (error) {
    console.error('Schedules fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Error fetching schedules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

async function fetchAllWorkflows(baseUrl: string, apiKey: string): Promise<WorkflowListItem[]> {
  let cursor: string | undefined
  let hasMore = true
  let allWorkflows: WorkflowListItem[] = []

  while (hasMore) {
    const url = cursor
      ? `${baseUrl}/api/v1/workflows?limit=100&cursor=${cursor}`
      : `${baseUrl}/api/v1/workflows?limit=100`

    const response = await fetchN8n<{ data?: WorkflowListItem[]; nextCursor?: string }>(
      url,
      apiKey
    )

    if (!response.ok) {
      throw new Error(response.error)
    }

    allWorkflows = allWorkflows.concat(response.data.data || [])
    cursor = response.data.nextCursor
    hasMore = !!cursor
  }

  return allWorkflows
}

type ScheduleTriggerNode = {
  id: string
  name: string
  type: string
  parameters: Record<string, unknown>
  parsedCrons: string[]
  parseErrors: string[]
}

async function fetchWorkflowDetails(
  workflows: WorkflowListItem[],
  baseUrl: string,
  apiKey: string
): Promise<WorkflowListItem[]> {
  const hydrated: WorkflowListItem[] = []

  for (const workflow of workflows) {
    const response = await fetchN8n<{ data?: WorkflowListItem } | WorkflowListItem>(
      `${baseUrl}/api/v1/workflows/${workflow.id}`,
      apiKey
    )

    if (!response.ok) {
      hydrated.push(workflow)
      continue
    }

    const data = response.data as { data?: WorkflowListItem }
    const detailed = data.data ?? (response.data as WorkflowListItem)
    hydrated.push({ ...workflow, ...detailed })
  }

  return hydrated
}

async function buildWorkflowsWithScheduleTriggers(
  workflows: WorkflowListItem[],
  baseUrl: string,
  apiKey: string
): Promise<{
  workflows: ScheduledWorkflow[]
  unparsedWorkflows: Array<{ id: string; name: string; url: string; reason: string }>
}> {
  const details = await fetchWorkflowDetails(workflows, baseUrl, apiKey)
  const unparsedWorkflows: Array<{ id: string; name: string; url: string; reason: string }> = []
  const workflowsWithTriggers = details
    .filter((workflow) => workflow.isArchived !== true)
    .map((workflow) => {
      const scheduleTriggers = extractScheduleTriggers(workflow.nodes || [])
      const hasUnparsed = scheduleTriggers.some((trigger) => trigger.parsedCrons.length === 0)
      if (hasUnparsed) {
        unparsedWorkflows.push({
          id: workflow.id,
          name: workflow.name,
          url: `${baseUrl}/workflow/${workflow.id}`,
          reason: 'Unable to parse schedule trigger parameters',
        })
      }
      return {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        nodes: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        updatedAt: workflow.updatedAt,
        scheduleTriggers,
      }
    })

  return { workflows: workflowsWithTriggers, unparsedWorkflows }
}

function extractScheduleTriggers(nodes: WorkflowNode[]): ScheduleTriggerNode[] {
  return nodes
    .filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger')
    .map((node) => {
      const { crons, errors } = parseScheduleTrigger(node.parameters || {})
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        parameters: node.parameters || {},
        parsedCrons: crons,
        parseErrors: errors,
      }
    })
}

function parseScheduleTrigger(parameters: Record<string, unknown>) {
  const crons: string[] = []
  const errors: string[] = []

  const rule = getObject(parameters, 'rule')
  const intervalList = getArray(rule ?? {}, 'interval')

  if (!Array.isArray(intervalList) || intervalList.length === 0) {
    errors.push('Missing rule.interval')
    return { crons, errors }
  }

  intervalList.forEach((interval, index) => {
    if (!interval || typeof interval !== 'object') {
      errors.push(`Interval ${index}: invalid`)
      return
    }
    const cron = intervalToCron(interval as Record<string, unknown>)
    if (cron) {
      crons.push(cron)
    } else {
      errors.push(`Interval ${index}: unsupported format`)
    }
  })

  return { crons: Array.from(new Set(crons)), errors }
}

function intervalToCron(interval: Record<string, unknown>) {
  const field = getString(interval, 'field')
  const rawExpression = getString(interval, 'expression')
  if (field === 'cronExpression' && rawExpression) {
    return rawExpression.trim().replace(/^=\s*/, '')
  }

  const minutesInterval = getNumber(interval, 'minutesInterval')
  if (minutesInterval && minutesInterval > 0) {
    return `*/${minutesInterval} * * * *`
  }

  const daysInterval = getNumber(interval, 'daysInterval')
  if (daysInterval && daysInterval > 0) {
    const hour = getNumber(interval, 'triggerAtHour') ?? 0
    const minute = getNumber(interval, 'triggerAtMinute') ?? 0
    return `${minute} ${hour} */${daysInterval} * *`
  }

  const weeksField = field === 'weeks'
  if (weeksField) {
    const hour = getNumber(interval, 'triggerAtHour') ?? 0
    const minute = getNumber(interval, 'triggerAtMinute') ?? 0
    const days = getArray(interval, 'triggerAtDay').filter((day) => typeof day === 'number') as number[]
    if (days.length > 0) {
      return `${minute} ${hour} * * ${days.join(',')}`
    }
  }

  const monthsField = field === 'months'
  if (monthsField) {
    const hour = getNumber(interval, 'triggerAtHour') ?? 0
    const minute = getNumber(interval, 'triggerAtMinute') ?? 0
    const dayOfMonth = getNumber(interval, 'triggerAtDayOfMonth') ?? 1
    return `${minute} ${hour} ${dayOfMonth} * *`
  }

  const minutesField = field === 'minutes'
  if (minutesField) {
    const intervalMinutes =
      getNumber(interval, 'minutesInterval') ??
      getNumber(interval, 'interval') ??
      getNumber(interval, 'value')
    if (intervalMinutes && intervalMinutes > 0) {
      return `*/${intervalMinutes} * * * *`
    }
  }

  const hoursField = field === 'hours'
  if (hoursField) {
    const intervalHours = getNumber(interval, 'hoursInterval') ?? getNumber(interval, 'interval')
    if (intervalHours && intervalHours > 0) {
      const minute = getNumber(interval, 'triggerAtMinute') ?? 0
      return `${minute} */${intervalHours} * * *`
    }
  }

  const dayOnlyHour = getNumber(interval, 'triggerAtHour')
  if (dayOnlyHour !== null && dayOnlyHour !== undefined) {
    const minute = getNumber(interval, 'triggerAtMinute') ?? 0
    return `${minute} ${dayOnlyHour} * * *`
  }

  return null
}

function getString(obj: Record<string, unknown> | undefined, key: string) {
  const value = obj?.[key]
  return typeof value === 'string' ? value : null
}

function getNumber(obj: Record<string, unknown> | undefined, key: string) {
  const value = obj?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }
  return null
}

function getArray(obj: Record<string, unknown> | undefined, key: string) {
  const value = obj?.[key]
  return Array.isArray(value) ? value : []
}

function getObject(obj: Record<string, unknown> | undefined, key: string) {
  const value = obj?.[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}
