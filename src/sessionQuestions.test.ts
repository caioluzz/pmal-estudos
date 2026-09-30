import { describe, expect, it } from 'vitest'
import { invalidQuestionBatchIndex, questionBatchesFromDrafts } from './sessionQuestions'
import { reviewAlerts } from './reviews'
import type { QuestionBatchDraft } from './types'

const drafts: QuestionBatchDraft[] = [
  { id: 'd1', origin: 'study', subject: 'Segurança da Informação', subtopic: '', total: 20, correct: 16 },
  { id: 'd2', origin: 'study', subject: 'Redes de Computadores', subtopic: 'Protocolos', total: 15, correct: 11 },
]

describe('baterias de uma sessão com vários assuntos', () => {
  it('salva cada assunto como uma bateria independente', () => {
    const batches = questionBatchesFromDrafts(drafts, 'informatica', '2026-09-23')

    expect(batches).toHaveLength(2)
    expect(new Set(batches.map((batch) => batch.id)).size).toBe(2)
    expect(batches.map((batch) => batch.subject)).toEqual([
      'Segurança da Informação',
      'Redes de Computadores',
    ])
    expect(batches.every((batch) => batch.disciplineId === 'informatica')).toBe(true)
  })

  it('gera uma revisão de 24h para cada assunto estudado', () => {
    const batches = questionBatchesFromDrafts(drafts, 'informatica', '2026-09-23')
    const tomorrow = reviewAlerts(batches, [], '2026-09-24')
      .filter((review) => review.interval === '24h')

    expect(tomorrow.map((review) => review.subject)).toEqual([
      'Segurança da Informação',
      'Redes de Computadores',
    ])
    expect(tomorrow.every((review) => review.dueDate === '2026-09-24')).toBe(true)
  })

  it('identifica qual bateria precisa ser corrigida', () => {
    expect(invalidQuestionBatchIndex(drafts)).toBe(-1)
    expect(invalidQuestionBatchIndex([{ ...drafts[0], subject: '  ' }, drafts[1]])).toBe(0)
    expect(invalidQuestionBatchIndex([drafts[0], { ...drafts[1], correct: 16 }])).toBe(1)
  })
})
