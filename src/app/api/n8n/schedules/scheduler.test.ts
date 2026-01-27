
// Jest globals are used


// @ts-ignore
import parser from 'cron-parser'
// @ts-ignore
const parseExpression = parser.parseExpression || parser.parse || parser.default?.parseExpression

describe('cron-parser', () => {
    it('should have a working parseExpression function', () => {
        expect(typeof parseExpression).toBe('function')
        expect(() => parseExpression('0 0 * * *')).not.toThrow()
    })
})

function extractCronExpressions(node: any): string[] {
    const parameters = node.parameters || {}
    const expressions: string[] = []

    const getObject = (obj: any, key: string) => (obj?.[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) ? obj[key] : undefined)
    const getString = (obj: any, key: string) => (typeof obj?.[key] === 'string' ? obj[key] : null)
    const getArray = (obj: any, key: string) => (Array.isArray(obj?.[key]) ? obj[key] : [])
    const getNumber = (obj: any, key: string) => {
        const value = obj?.[key]
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string' && value.trim() !== '') {
            const num = Number(value)
            return Number.isFinite(num) ? num : null
        }
        return null
    }

    const intervalToCron = (interval?: any, triggerAt?: any) => {
        if (!interval) return null
        const field = getString(interval, 'field') ?? getString(interval, 'unit')
        const value = getNumber(interval, 'value') ?? getNumber(interval, 'interval') ?? 1

        const trigger = triggerAt || getObject(interval, 'triggerAt') || interval
        const minute = getNumber(trigger, 'minute') ?? getNumber(trigger, 'triggerAtMinute') ?? 0
        const hour = getNumber(trigger, 'hour') ?? getNumber(trigger, 'triggerAtHour') ?? 0
        const weekday = getNumber(trigger, 'weekday') ?? getNumber(trigger, 'triggerAtDay')
        const weekdays = getArray(trigger, 'triggerAtDay').filter((day: any) => typeof day === 'number') as number[]

        const normalizedField = field ?? 'days'
        if (!normalizedField || value < 1) return null

        switch (normalizedField) {
            case 'minutes':
                return `*/${value} * * * *`
            case 'hours':
                return `${minute} */${value} * * *`
            case 'days':
                return `${minute} ${hour} */${value} * *`
            case 'weeks':
                if (weekdays.length > 0) {
                    return `${minute} ${hour} * * ${weekdays.join(',')}`
                }
                if (weekday !== undefined && weekday !== null) {
                    return `${minute} ${hour} * * ${weekday}`
                }
                return `${minute} ${hour} */${value} * *`
            case 'months':
                return `${minute} ${hour} 1 */${value} *`
            default:
                return null
        }
    }

    const rule = getObject(parameters, 'rule')
    if (rule) {
        const ruleCron = getString(rule, 'cronExpression')
        if (ruleCron) {
            expressions.push(ruleCron)
        }

        const ruleIntervalList = getArray(rule, 'interval')
        const ruleTriggerAt = getObject(rule, 'triggerAt')
        ruleIntervalList.forEach((interval) => {
            const intervalCron = intervalToCron(interval, ruleTriggerAt)
            if (intervalCron) {
                expressions.push(intervalCron)
            }
        })

        // Also check direct interval object on rule
        const ruleInterval = getObject(rule, 'interval')
        const ruleIntervalCron = intervalToCron(ruleInterval, ruleTriggerAt)
        if (ruleIntervalCron) {
            expressions.push(ruleIntervalCron)
        }
    }

    const directCron = getString(parameters, 'cronExpression')
    if (directCron) {
        expressions.push(directCron)
    }

    const rules = getArray(parameters, 'rules')
    rules.forEach((rule) => {
        const cron = getString(rule, 'cronExpression')
        if (cron) {
            expressions.push(cron)
            return
        }

        const interval = getObject(rule, 'interval')
        const triggerAt = getObject(rule, 'triggerAt')
        const intervalCron = intervalToCron(interval, triggerAt)
        if (intervalCron) {
            expressions.push(intervalCron)
        }
    })

    // Handling 'interval' mode directly
    const interval = getObject(parameters, 'interval')
    // triggerTimes can be array of dates or time strings? In n8n node it's usually complex.
    const triggerTimes = getArray(parameters, 'triggerTimes')

    if (interval) {
        const intervalCron = intervalToCron(interval, triggerTimes[0])
        if (intervalCron) {
            expressions.push(intervalCron)
        }
    }

    const fallbackCron = getString(parameters, 'cron')
    if (fallbackCron) {
        expressions.push(fallbackCron)
    }

    // Try to treat parameters as a legacy interval (has unit and interval/value at top level)
    const topIntervalCron = intervalToCron(parameters, triggerTimes[0])
    if (topIntervalCron) {
        expressions.push(topIntervalCron)
    }

    return Array.from(new Set(expressions))
}

describe('extractCronExpressions', () => {
    it('should extract cron from direct cronExpression parameter', () => {
        const node = {
            parameters: {
                cronExpression: '0 9 * * *'
            }
        }
        expect(extractCronExpressions(node)).toContain('0 9 * * *')
    })

    it('should extract cron from rule.interval (new n8n style)', () => {
        const node = {
            parameters: {
                rule: {
                    interval: [
                        {
                            field: 'days',
                            value: 1,
                            triggerAt: {
                                hour: 10,
                                minute: 30
                            }
                        }
                    ]
                }
            }
        }
        // intervalToCron: minutes hour */value * *
        // field=days, value=1 -> */1 days
        // triggerAt: 10:30
        // Expect: 30 10 */1 * *
        expect(extractCronExpressions(node)).toContain('30 10 */1 * *')
    })

    it('should extract cron from rule.cronExpression', () => {
        const node = {
            parameters: {
                rule: {
                    cronExpression: '15 14 * * FRI'
                }
            }
        }
        expect(extractCronExpressions(node)).toContain('15 14 * * FRI')
    })

    it('should handle interval mode', () => {
        const node = {
            parameters: {
                triggerTimes: [
                    {
                        hour: 14,
                        minute: 0
                    }
                ],
                interval: {
                    field: 'days',
                    value: 1
                }
            }
        }
        // 0 14 */1 * *
        expect(extractCronExpressions(node)).toContain('0 14 */1 * *')
    })

    it('should handle legacy cron node with parameters.cron', () => {
        const node = {
            parameters: {
                cron: '* * * * *'
            }
        }
        expect(extractCronExpressions(node)).toContain('* * * * *')
    })

    it('should handle legacy interval node with parameters.interval', () => {
        const node = {
            parameters: {
                interval: 10,
                unit: 'minutes'
            }
        }
        expect(extractCronExpressions(node)).toContain('*/10 * * * *')
    })
    it('should handle legacy interval node with string parameters', () => {
        const node = {
            parameters: {
                interval: "10",
                unit: 'minutes'
            }
        }
        expect(extractCronExpressions(node)).toContain('*/10 * * * *')
    })
})
