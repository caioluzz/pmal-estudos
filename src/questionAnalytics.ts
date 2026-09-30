import type { QuestionBatch } from './types'

export type EvolutionPeriod = '30d' | '90d' | 'all'

export type EvolutionFilters = {
  disciplineId: string
  subject: string
  subtopic: string
  period: EvolutionPeriod
}

export type EvolutionPoint = {
  date: string
  total: number
  correct: number
  rate: number
  batches: number
}

export type EvolutionSummary = {
  total: number
  correct: number
  rate: number
  days: number
  change: number | null
  best: EvolutionPoint | null
}

const periodDays: Record<Exclude<EvolutionPeriod, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
}

function subtractDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterEvolutionBatches(
  batches: QuestionBatch[],
  filters: EvolutionFilters,
  referenceDate: string,
) {
  const cutoff = filters.period === 'all'
    ? null
    : subtractDays(referenceDate, periodDays[filters.period] - 1)

  return batches.filter((batch) => (
    batch.disciplineId === filters.disciplineId
    && (filters.subject === 'all' || batch.subject === filters.subject)
    && (filters.subtopic === 'all' || (batch.subtopic ?? '') === filters.subtopic)
    && (!cutoff || batch.date >= cutoff)
    && batch.date <= referenceDate
  ))
}

export function buildEvolutionSeries(batches: QuestionBatch[]): EvolutionPoint[] {
  const byDate = new Map<string, Omit<EvolutionPoint, 'rate'>>()

  for (const batch of batches) {
    const current = byDate.get(batch.date)
    byDate.set(batch.date, current
      ? {
          ...current,
          total: current.total + batch.total,
          correct: current.correct + batch.correct,
          batches: current.batches + 1,
        }
      : { date: batch.date, total: batch.total, correct: batch.correct, batches: 1 })
  }

  return [...byDate.values()]
    .map((point) => ({
      ...point,
      rate: point.total ? Math.round((point.correct / point.total) * 1_000) / 10 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function summarizeEvolution(points: EvolutionPoint[]): EvolutionSummary {
  const total = points.reduce((sum, point) => sum + point.total, 0)
  const correct = points.reduce((sum, point) => sum + point.correct, 0)
  const first = points[0]
  const last = points.at(-1)
  const best = points.reduce<EvolutionPoint | null>((current, point) => (
    !current || point.rate > current.rate || (point.rate === current.rate && point.total > current.total)
      ? point
      : current
  ), null)

  return {
    total,
    correct,
    rate: total ? Math.round((correct / total) * 1_000) / 10 : 0,
    days: points.length,
    change: first && last && first !== last ? Math.round((last.rate - first.rate) * 10) / 10 : null,
    best,
  }
}
