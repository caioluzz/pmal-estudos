export type Difficulty = 'Fácil' | 'Médio' | 'Difícil'
export type TopicStatus = 'Não iniciado' | 'Lido' | 'Resumido' | 'Revisado'

export interface Discipline {
  id: string
  name: string
  color: string
  difficulty: Difficulty
}

export interface QuestionBatch {
  id: string
  disciplineId: string
  subject: string
  subtopic?: string
  total: number
  correct: number
  date: string
}

export interface EdictTopic {
  id: string
  title: string
  status: TopicStatus
  children?: EdictTopic[]
}

export interface EdictSection {
  id: string
  title: string
  topics: EdictTopic[]
}

export interface Mission {
  id: string
  disciplineId: string
  title: string
  plannedMinutes: number
  completed: boolean
  notes: string
  date: string
}

export interface StudySession {
  id: string
  disciplineId: string
  missionId?: string
  seconds: number
  date: string
  notes: string
}

export interface Availability {
  day: number
  minutes: number
}

export interface WeeklyPlanItem {
  id: string
  day: number
  disciplineId: string
}
