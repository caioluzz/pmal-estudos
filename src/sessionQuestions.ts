import { uid } from './lib'
import type { QuestionBatch, QuestionBatchDraft } from './types'

export function createQuestionBatchDraft(
  origin: QuestionBatchDraft['origin'] = 'study',
  subject = '',
  subtopic = '',
): QuestionBatchDraft {
  return { id: uid(), origin, subject, subtopic, total: 20, correct: 0 }
}

export function invalidQuestionBatchIndex(drafts: QuestionBatchDraft[]) {
  return drafts.findIndex((draft) => (
    !draft.subject.trim()
    || draft.total < 1
    || draft.correct < 0
    || draft.correct > draft.total
  ))
}

export function questionBatchesFromDrafts(
  drafts: QuestionBatchDraft[],
  disciplineId: string,
  date: string,
): QuestionBatch[] {
  return drafts.map((draft) => ({
    id: uid(),
    disciplineId,
    subject: draft.subject.trim(),
    subtopic: draft.subtopic.trim() || undefined,
    origin: draft.origin,
    total: draft.total,
    correct: draft.correct,
    date,
  }))
}
