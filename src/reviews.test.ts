import { describe, expect, it } from 'vitest'
import { reviewAlerts } from './reviews'
import type { Mission, QuestionBatch } from './types'

const batch = (id: string, date: string): QuestionBatch => ({
  id,
  disciplineId: 'matematica',
  subject: 'Porcentagem',
  total: 20,
  correct: 15,
  date,
})

const reviewMission = (id: string, interval: '24h' | '7 dias' | '30 dias', date: string): Mission => ({
  id,
  disciplineId: 'matematica',
  title: `Revisão ${interval} · Porcentagem`,
  plannedMinutes: 20,
  completed: true,
  notes: '',
  date,
})

describe('agenda de revisões', () => {
  it('mantém 24h, 7d e 30d ancorados no estudo original', () => {
    const alerts = reviewAlerts([batch('estudo', '2026-01-01')], [], '2026-01-01')

    expect(alerts.map(({ interval, dueDate }) => ({ interval, dueDate }))).toEqual([
      { interval: '24h', dueDate: '2026-01-02' },
      { interval: '7 dias', dueDate: '2026-01-08' },
      { interval: '30 dias', dueDate: '2026-01-31' },
    ])
  })

  it('não cria revisão de 24h a partir de uma bateria feita na revisão', () => {
    const alerts = reviewAlerts(
      [batch('estudo', '2026-01-01'), batch('revisao-24h', '2026-01-02')],
      [reviewMission('missao-24h', '24h', '2026-01-02')],
      '2026-01-03',
    )

    expect(alerts.map((alert) => alert.interval)).toEqual(['7 dias', '30 dias'])
    expect(alerts.every((alert) => alert.sourceDate === '2026-01-01')).toBe(true)
    expect(alerts.some((alert) => alert.dueDate === '2026-01-03')).toBe(false)
  })

  it('ignora como origem uma bateria explicitamente registrada como revisão', () => {
    const reviewBatch = { ...batch('revisao', '2026-01-02'), origin: 'review' as const }
    const alerts = reviewAlerts([batch('estudo', '2026-01-01'), reviewBatch], [], '2026-01-03')

    expect(alerts.every((alert) => alert.sourceDate === '2026-01-01')).toBe(true)
    expect(alerts.some((alert) => alert.dueDate === '2026-01-03')).toBe(false)
  })

  it('só inicia outro ciclo com estudo posterior à revisão de 30 dias', () => {
    const alerts = reviewAlerts(
      [
        batch('estudo', '2026-01-01'),
        batch('revisao-30d', '2026-01-31'),
        batch('novo-estudo', '2026-02-02'),
      ],
      [
        reviewMission('missao-24h', '24h', '2026-01-02'),
        reviewMission('missao-7d', '7 dias', '2026-01-08'),
        reviewMission('missao-30d', '30 dias', '2026-01-31'),
      ],
      '2026-02-02',
    )

    expect(alerts.map((alert) => alert.dueDate)).toEqual(['2026-02-03', '2026-02-09', '2026-03-04'])
    expect(alerts.every((alert) => alert.sourceDate === '2026-02-02')).toBe(true)
  })
})
