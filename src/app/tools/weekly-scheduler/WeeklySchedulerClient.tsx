'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, type Event as CalendarEvent } from 'react-big-calendar'
import { format, parse, startOfWeek, endOfWeek, startOfDay, endOfDay, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useConnections } from '@/src/hooks/useConnections'
import { useWeeklyScheduler } from '@/src/hooks/useWeeklyScheduler'
import { Button } from '@/src/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog'
import { Badge } from '@/src/components/ui/badge'
import { Input } from '@/src/components/ui/input'
import { Switch } from '@/src/components/ui/switch'

type SchedulerEvent = {
  id: string
  title: string
  start: string
  end: string
  workflowId: string
  cron: string
  averageDurationMs: number | null
}

type CalendarResource = {
  event: SchedulerEvent
}

// Custom event component for better text display
function CustomEvent({ event }: { event: CalendarEvent }) {
  const resource = event.resource as CalendarResource | undefined
  if (!resource) return <div className="text-xs">{event.title}</div>

  return (
    <div className="h-full flex items-center px-1 cursor-pointer overflow-hidden">
      <div className="text-xs font-medium truncate w-full">
        {resource.event.title}
      </div>
    </div>
  )
}

function formatDurationMs(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 'n/a'
  const totalSeconds = Math.round(durationMs / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
})

export default function WeeklySchedulerClient() {
  const { connections, activeConnection, loading: connectionsLoading } = useConnections()
  const { events, loading, error, load } = useWeeklyScheduler()
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [rangeStart, setRangeStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [rangeEnd, setRangeEnd] = useState<Date>(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [excludedWorkflows, setExcludedWorkflows] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<SchedulerEvent | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<SchedulerEvent[] | null>(null)
  const [currentView, setCurrentView] = useState<'week' | 'day' | 'agenda'>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const workflowBaseUrl = useMemo(() => {
    if (!activeConnection?.base_url) return null
    return activeConnection.base_url.replace(/\/+$/, '')
  }, [activeConnection?.base_url])
  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem('n8n:scheduler:excluded-workflows')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setExcludedWorkflows(parsed.filter((id) => typeof id === 'string'))
        }
      }
    } catch {
      setExcludedWorkflows([])
    }
  }, [])

  useEffect(() => {
    if (activeConnection?.id && !connectionId) {
      setConnectionId(activeConnection.id)
    }
  }, [activeConnection, connectionId])

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return undefined
    }
  }, [])

  const refresh = async () => {
    await load({
      connectionId,
      timeZone,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
    })
  }

  const updateRange = (date: Date, view: 'week' | 'day' | 'agenda') => {
    if (view === 'day') {
      setRangeStart(startOfDay(date))
      setRangeEnd(endOfDay(date))
      return
    }
    setRangeStart(startOfWeek(date, { weekStartsOn: 1 }))
    setRangeEnd(endOfWeek(date, { weekStartsOn: 1 }))
  }

  useEffect(() => {
    if (connectionId) {
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, timeZone, rangeStart, rangeEnd])

  const filteredEvents = events.filter(
    (event) => !excludedWorkflows.includes(event.workflowId)
  )

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return filteredEvents.map((event) => {
      const resource: CalendarResource = { event }
      return {
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        resource,
      }
    })
  }, [filteredEvents])

  const workflowOptions = Array.from(
    new Map(
      events.map((event) => [event.workflowId, event.title])
    ).entries()
  ).map(([id, name]) => ({ id, name }))

  const filteredWorkflowOptions = workflowOptions.filter((workflow) =>
    workflow.name.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const toggleWorkflow = (workflowId: string) => {
    setExcludedWorkflows((prev) => {
      const next = prev.includes(workflowId)
        ? prev.filter((id) => id !== workflowId)
        : [...prev, workflowId]
      localStorage.setItem('n8n:scheduler:excluded-workflows', JSON.stringify(next))
      return next
    })
  }

  const setAllVisible = () => {
    setExcludedWorkflows([])
    localStorage.setItem('n8n:scheduler:excluded-workflows', JSON.stringify([]))
  }

  const setAllHidden = () => {
    const allIds = workflowOptions.map((workflow) => workflow.id)
    setExcludedWorkflows(allIds)
    localStorage.setItem('n8n:scheduler:excluded-workflows', JSON.stringify(allIds))
  }


  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Skeleton or loading state to prevent layout shift */}
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-card border border-border rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Weekly Scheduler</h1>
            <p className="text-muted-foreground">
              Active workflows with Schedule Trigger mapped onto the next 7 days
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={refresh} disabled={loading || connectionsLoading || !connectionId}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilterOpen((open) => !open)}
              disabled={workflowOptions.length === 0}
            >
              Filters
            </Button>
          </div>
        </div>

        {filterOpen && workflowOptions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Workflow filters</div>
                <div className="text-xs text-muted-foreground">
                  Hide or show workflows in the calendar
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={setAllVisible}>
                  Show all
                </Button>
                <Button variant="outline" size="sm" onClick={setAllHidden}>
                  Hide all
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search workflows..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
              <Badge variant="secondary">
                {filteredWorkflowOptions.length}/{workflowOptions.length}
              </Badge>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {filteredWorkflowOptions.map((workflow) => {
                const excluded = excludedWorkflows.includes(workflow.id)
                return (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {workflow.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {workflow.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {excluded ? 'Hidden' : 'Visible'}
                      </span>
                      <Switch
                        checked={!excluded}
                        onCheckedChange={() => toggleWorkflow(workflow.id)}
                      />
                    </div>
                  </div>
                )
              })}
              {filteredWorkflowOptions.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">
                  No workflows match this search.
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card border border-border rounded-xl p-4">
          {!loading && calendarEvents.length === 0 && (
            <div className="text-sm text-muted-foreground mb-4">
              No scheduled workflows found for the selected connection.
            </div>
          )}
          <style>{`
            .rbc-time-slot {
              min-height: 40px;
            }
            .rbc-event {
              padding: 2px !important;
            }
            .rbc-event-content {
              overflow: hidden;
              width: 100%;
              height: 100%;
            }
          `}</style>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            components={{
              event: CustomEvent,
            }}
            view={currentView}
            date={currentDate}
            views={['week', 'day', 'agenda']}
            step={10}
            timeslots={1}
            style={{ height: 1600 }}
            onSelectEvent={(event) => {
              const resource = event.resource as CalendarResource | undefined
              if (!resource) return
              setSelectedGroup(null)
              setSelectedEvent(resource.event)
            }}
            onView={(view) => {
              const nextView = view as 'week' | 'day' | 'agenda'
              setCurrentView(nextView)
              updateRange(currentDate, nextView)
            }}
            onNavigate={(date, view) => {
              const nextView = (view as 'week' | 'day' | 'agenda') || currentView
              setCurrentDate(date)
              updateRange(date, nextView)
            }}
            eventPropGetter={(event: CalendarEvent) => {
              const resource = event.resource as CalendarResource | undefined
              if (!resource) return {}

              const isExcluded = excludedWorkflows.includes(resource.event.workflowId)

              // Generate consistent color for each workflow
              const hash = resource.event.workflowId.split('').reduce((acc, char) => {
                return char.charCodeAt(0) + ((acc << 5) - acc)
              }, 0)
              const hue = Math.abs(hash % 360)

              return {
                className: `!rounded-md !border-2 !border-border hover:!shadow-md transition-shadow cursor-pointer ${
                  isExcluded ? '!bg-muted !text-muted-foreground' : ''
                }`,
                style: isExcluded ? {} : {
                  backgroundColor: `hsl(${hue}, 70%, 95%)`,
                  color: `hsl(${hue}, 70%, 30%)`,
                  borderColor: `hsl(${hue}, 70%, 70%)`,
                },
              }
            }}
            dayLayoutAlgorithm="overlap"
            tooltipAccessor={(event: CalendarEvent) => {
              const resource = event.resource as CalendarResource | undefined
              if (!resource) return String(event.title || '')
              const avg = resource.event.averageDurationMs
                ? `Avg: ${Math.round(resource.event.averageDurationMs / 1000)}s`
                : 'Avg: n/a'
              return `${resource.event.title} • ${avg} • ${resource.event.cron}`
            }}
            formats={{
              timeGutterFormat: (date) => format(date, 'HH:mm'),
              eventTimeRangeFormat: ({ start, end }) =>
                `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
            }}
          />
        </div>
      </div>

      <Dialog
        open={!!selectedEvent || !!selectedGroup}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null)
            setSelectedGroup(null)
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                {workflowBaseUrl ? (
                  <a
                    className="text-lg font-semibold text-primary underline underline-offset-4"
                    href={`${workflowBaseUrl}/workflow/${selectedEvent.workflowId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selectedEvent.title}
                  </a>
                ) : (
                  <div className="text-lg font-semibold text-foreground">{selectedEvent.title}</div>
                )}
                <div className="text-sm text-muted-foreground">{selectedEvent.workflowId}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedEvent.cron}</Badge>
                <Badge variant="secondary">
                  {format(new Date(selectedEvent.start), 'PPpp')} →{' '}
                  {format(new Date(selectedEvent.end), 'PPpp')}
                </Badge>
                <Badge variant="outline">
                  Duration{' '}
                  {formatDurationMs(
                    new Date(selectedEvent.end).getTime() -
                      new Date(selectedEvent.start).getTime()
                  )}
                </Badge>
                {selectedEvent.averageDurationMs ? (
                  <Badge variant="outline">
                    {`Avg ${Math.round(selectedEvent.averageDurationMs / 1000)}s`}
                  </Badge>
                ) : null}
              </div>
            </div>
          )}
          {selectedGroup && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {selectedGroup.length} workflows scheduled at the same time
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {selectedGroup.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-border p-3 bg-background"
                  >
                    {workflowBaseUrl ? (
                      <a
                        className="text-sm font-medium text-primary underline underline-offset-4"
                        href={`${workflowBaseUrl}/workflow/${event.workflowId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {event.title}
                      </a>
                    ) : (
                      <div className="text-sm font-medium text-foreground">{event.title}</div>
                    )}
                    <div className="text-xs text-muted-foreground">{event.workflowId}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline">{event.cron}</Badge>
                      <Badge variant="secondary">
                        {format(new Date(event.start), 'PPpp')} →{' '}
                        {format(new Date(event.end), 'PPpp')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
