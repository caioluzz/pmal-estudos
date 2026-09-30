import { today } from './lib'
import type { Mission, QuestionBatch } from './types'

export type ReviewAlert = {
  id: string
  disciplineId: string
  subject: string
  subtopic?: string
  interval: '24h' | '7 dias' | '30 dias'
  dueDate: string
  sourceDate: string
  daysLate: number
}

const reviewIntervals = [
  { label: '24h' as const, days: 1 },
  { label: '7 dias' as const, days: 7 },
  { label: '30 dias' as const, days: 30 },
]

const localDate = (value: string) => new Date(`${value}T12:00:00`)

const addDays = (value: string, days: number) => {
  const date = localDate(value)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const topicKey = (batch: QuestionBatch) =>
  `${batch.disciplineId}|${batch.subject.trim().toLowerCase()}|${batch.subtopic?.trim().toLowerCase() ?? ''}`

const reviewTitle = (interval: ReviewAlert['interval'], batch: QuestionBatch) =>
  `Revisão ${interval} · ${batch.subject}${batch.subtopic ? ` · ${batch.subtopic}` : ''}`

const completedReview = (missions: Mission[], batch: QuestionBatch, interval: ReviewAlert['interval'], dueDate: string) =>
  missions
    .filter((mission) => mission.completed
      && mission.disciplineId === batch.disciplineId
      && mission.title === reviewTitle(interval, batch)
      && mission.date >= dueDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

/**
 * Mantém uma única sequência de revisão por assunto. Baterias feitas durante
 * as revisões de 24h, 7d ou 30d pertencem ao ciclo atual e não o reiniciam.
 * Um novo ciclo só pode nascer de uma bateria posterior à conclusão dos 30 dias.
 */
function currentCycleSource(batches: QuestionBatch[], missions: Mission[]) {
  const ordered = [...batches].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  let source = ordered[0]
  if (!source) return undefined

  while (source) {
    const dueDate = addDays(source.date, 30)
    const completion = completedReview(missions, source, '30 dias', dueDate)
    if (!completion) return source

    const nextSource = ordered.find((batch) => batch.date > completion.date)
    if (!nextSource) return source
    source = nextSource
  }

  return source
}

export function reviewAlerts(batches: QuestionBatch[], missions: Mission[] = [], asOf = today()): ReviewAlert[] {
  const grouped = new Map<string, QuestionBatch[]>()
  batches.forEach((batch) => {
    if (batch.origin === 'review') return
    const key = topicKey(batch)
    grouped.set(key, [...(grouped.get(key) ?? []), batch])
  })

  const current = localDate(asOf).getTime()
  return [...grouped.values()].flatMap((topicBatches) => {
    const batch = currentCycleSource(topicBatches, missions)
    if (!batch) return []

    return reviewIntervals.map(({ label, days }) => {
      const dueDate = addDays(batch.date, days)
      return {
        id: `${batch.id}-${days}`,
        disciplineId: batch.disciplineId,
        subject: batch.subject,
        subtopic: batch.subtopic,
        interval: label,
        dueDate,
        sourceDate: batch.date,
        daysLate: Math.floor((current - localDate(dueDate).getTime()) / 86400000),
      }
    }).filter((review) => !completedReview(missions, batch, review.interval, review.dueDate))
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}
