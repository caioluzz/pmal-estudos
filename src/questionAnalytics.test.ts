import { describe, expect, it } from 'vitest'
import { buildEvolutionSeries, filterEvolutionBatches, summarizeEvolution } from './questionAnalytics'
import type { QuestionBatch } from './types'

const batches: QuestionBatch[] = [
  { id: '1', disciplineId: 'matematica', subject: 'Porcentagem', subtopic: 'Descontos', total: 10, correct: 6, date: '2026-07-01' },
  { id: '2', disciplineId: 'matematica', subject: 'Porcentagem', subtopic: 'Descontos', total: 20, correct: 18, date: '2026-09-15' },
  { id: '3', disciplineId: 'matematica', subject: 'Porcentagem', subtopic: 'Acréscimos', total: 10, correct: 7, date: '2026-09-15' },
  { id: '4', disciplineId: 'matematica', subject: 'Juros', total: 12, correct: 9, date: '2026-09-30' },
  { id: '5', disciplineId: 'portugues', subject: 'Crase', total: 10, correct: 8, date: '2026-09-30' },
]

describe('evolução de questões', () => {
  it('combina baterias da mesma data e calcula a taxa ponderada', () => {
    const points = buildEvolutionSeries(batches.slice(1, 3))

    expect(points).toEqual([
      { date: '2026-09-15', total: 30, correct: 25, rate: 83.3, batches: 2 },
    ])
  })

  it('filtra por matéria, assunto, subassunto e últimos 30 dias', () => {
    const filtered = filterEvolutionBatches(batches, {
      disciplineId: 'matematica',
      subject: 'Porcentagem',
      subtopic: 'Descontos',
      period: '30d',
    }, '2026-09-30')

    expect(filtered.map((batch) => batch.id)).toEqual(['2'])
  })

  it('consolida todas as disciplinas quando o filtro de matéria está aberto', () => {
    const filtered = filterEvolutionBatches(batches, {
      disciplineId: 'all',
      subject: 'all',
      subtopic: 'all',
      period: 'all',
    }, '2026-09-30')

    expect(filtered).toHaveLength(5)
    expect(new Set(filtered.map((batch) => batch.disciplineId))).toEqual(new Set(['matematica', 'portugues']))
  })

  it('resume volume, aproveitamento, melhor data e variação entre extremos', () => {
    const summary = summarizeEvolution(buildEvolutionSeries([
      { ...batches[0], date: '2026-09-01' },
      batches[3],
    ]))

    expect(summary).toMatchObject({ total: 22, correct: 15, rate: 68.2, days: 2, change: 15 })
    expect(summary.best?.date).toBe('2026-09-30')
  })
})
