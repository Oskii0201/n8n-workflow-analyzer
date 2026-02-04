import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/src/lib/auth-helpers'
import { resolveConnection } from '@/src/lib/n8n-connection'
import { fetchN8n } from '@/src/lib/n8n-client'
import { requireString } from '@/src/lib/validation'
import { rateLimit } from '@/src/lib/rate-limit'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import parser from 'cron-parser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseExpression =
  (parser as any).parseExpression ||
  (parser as any).parse ||
  (parser as any).default?.parseExpression

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
  notes?: string
}

type ScheduleEvent = {
  id: string
  title: string
  start: string
  end: string
  workflowId: string
  cron: string
  averageDurationMs: number | null
}

const DEFAULT_EVENT_SECONDS = 300
const MAX_EVENTS_PER_WORKFLOW = 500
const EVENTS_CACHE_TTL_MS = 60_000

type Cached<T> = { value: T; expiresAt: number }

const eventsCache = new Map<string, Cached<ScheduleEvent[]>>()
let lastCacheCleanup = 0

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, 'n8n:schedules:events', { limit: 15, windowMs: 60_000 })
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
    const rangeStart =
      body?.rangeStart !== undefined
        ? requireString(body.rangeStart, 'rangeStart', { minLength: 1, trim: true })
        : null
    const rangeEnd =
      body?.rangeEnd !== undefined
        ? requireString(body.rangeEnd, 'rangeEnd', { minLength: 1, trim: true })
        : null

    if (connectionId && !connectionId.ok) {
      return NextResponse.json({ success: false, error: connectionId.error }, { status: 400 })
    }
    if (timeZone && !timeZone.ok) {
      return NextResponse.json({ success: false, error: timeZone.error }, { status: 400 })
    }
    if (rangeStart && !rangeStart.ok) {
      return NextResponse.json({ success: false, error: rangeStart.error }, { status: 400 })
    }
    if (rangeEnd && !rangeEnd.ok) {
      return NextResponse.json({ success: false, error: rangeEnd.error }, { status: 400 })
    }

    const resolvedRangeStart = rangeStart?.ok ? new Date(rangeStart.value) : null
    const resolvedRangeEnd = rangeEnd?.ok ? new Date(rangeEnd.value) : null
    if (!resolvedRangeStart || Number.isNaN(resolvedRangeStart.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid rangeStart' }, { status: 400 })
    }
    if (!resolvedRangeEnd || Number.isNaN(resolvedRangeEnd.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid rangeEnd' }, { status: 400 })
    }

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

    const tz = timeZone?.ok ? timeZone.value : undefined
    const cacheKey = [
      connectionResolved.baseUrl,
      connectionResolved.apiKey,
      tz ?? '',
      resolvedRangeStart.toISOString(),
      resolvedRangeEnd.toISOString(),
    ].join('|')
    const cachedEvents = eventsCache.get(cacheKey)
    if (cachedEvents && cachedEvents.expiresAt > Date.now()) {
      return NextResponse.json({
        success: true,
        data: {
          events: cachedEvents.value,
          timeZone: tz,
          rangeStart: resolvedRangeStart.toISOString(),
          rangeEnd: resolvedRangeEnd.toISOString(),
          cached: true,
        },
      })
    }

    const workflows = await fetchAllWorkflows(connectionResolved.baseUrl, connectionResolved.apiKey)

    cleanupCaches()

    const events: ScheduleEvent[] = []

    workflows
      .filter((workflow) => workflow.active === true)
      .forEach((workflow) => {
        const triggers = extractScheduleTriggers(workflow.nodes || []).filter(
          (trigger) => trigger.parsedCrons.length > 0
        )
        if (triggers.length === 0) return

        triggers.forEach((trigger) => {
          trigger.parsedCrons.forEach((cron) => {
            const occurrences = getOccurrences(
              cron,
              resolvedRangeStart,
              resolvedRangeEnd,
              tz,
              MAX_EVENTS_PER_WORKFLOW
            )
            const seconds =
              trigger.durationSeconds && trigger.durationSeconds > 0
                ? trigger.durationSeconds
                : DEFAULT_EVENT_SECONDS
            const durationMs = seconds * 1000
            occurrences.forEach((occurrence, index) => {
              events.push({
                id: `${workflow.id}:${trigger.id}:${cron}:${index}`,
                title: workflow.name,
                start: occurrence.toISOString(),
                end: new Date(occurrence.getTime() + durationMs).toISOString(),
                workflowId: workflow.id,
                cron,
                averageDurationMs: null,
              })
            })
          })
        })
      })

    eventsCache.set(cacheKey, {
      value: events,
      expiresAt: Date.now() + EVENTS_CACHE_TTL_MS,
    })

    return NextResponse.json({
      success: true,
      data: {
        events,
        timeZone: tz,
        rangeStart: resolvedRangeStart.toISOString(),
        rangeEnd: resolvedRangeEnd.toISOString(),
        cached: false,
      },
    })
  } catch (error) {
    console.error('Schedules events error:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Error fetching schedules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

type ScheduleTriggerNode = {
  id: string
  name: string
  type: string
  parameters: Record<string, unknown>
  parsedCrons: string[]
  parseErrors: string[]
  durationSeconds: number | null
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

function extractScheduleTriggers(nodes: WorkflowNode[]): ScheduleTriggerNode[] {
  return nodes
    .filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger')
    .map((node) => {
      const { crons, errors } = parseScheduleTrigger(node.parameters || {})
      const durationSeconds = parseDurationSeconds(node.notes)
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        parameters: node.parameters || {},
        parsedCrons: crons,
        parseErrors: errors,
        durationSeconds,
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

function getOccurrences(cron: string, start: Date, end: Date, tz?: string, limit?: number) {
  const occurrences: Date[] = []
  try {
    const interval = parseExpression(cron, { currentDate: start, endDate: end, tz })
    while (true) {
      try {
        const next = interval.next()
        const date = next.toDate ? next.toDate() : new Date(next.toString())
        if (date.getTime() > end.getTime()) break
        occurrences.push(date)
        if (limit && occurrences.length >= limit) break
      } catch (err) {
        if (err instanceof Error && err.message.includes('Out of the time span range')) {
          break
        }
        console.error('Error generating occurrence:', err, 'Cron:', cron)
        break
      }
    }
  } catch (err) {
    console.error('Error parsing cron:', err, 'Cron:', cron)
    return occurrences
  }
  return occurrences
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

function parseDurationSeconds(notes?: string) {
  if (!notes || typeof notes !== 'string') return null
  const match = notes.match(/duration\s*=\s*(\d+(\.\d+)?)/i)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

function cleanupCaches() {
  const now = Date.now()
  if (now - lastCacheCleanup < EVENTS_CACHE_TTL_MS) return
  lastCacheCleanup = now

  for (const [key, entry] of eventsCache.entries()) {
    if (entry.expiresAt <= now) {
      eventsCache.delete(key)
    }
  }
}
