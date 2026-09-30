import type { StudySession } from './types'

export const uid = () => crypto.randomUUID()

export const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const greetingForHour = (hour: number) => {
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const percentage = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0

export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`
}

export const formatHours = (minutes: number) => {
  const hours = minutes / 60
  if (hours > 0 && hours < 0.01) return '<0,01h'
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(hours)}h`
}

export const formatStudySeconds = (seconds: number) =>
  formatMinutes(seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0)

export const studySecondsForMission = (sessions: StudySession[], missionId: string) =>
  sessions
    .filter((session) => session.missionId === missionId)
    .reduce((total, session) => total + session.seconds, 0)

export const studySecondsOnDate = (sessions: StudySession[], date: string) =>
  sessions
    .filter((session) => session.date === date)
    .reduce((total, session) => total + session.seconds, 0)

export const formatClock = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export const runningTimerSeconds = (elapsed: number, startedAt: number | null, now = Date.now()) =>
  elapsed + (startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000)))

export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')

export const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Distribui todo o tempo entre as missões, mantendo um bloco mínimo para cada
 * uma e usando os pesos para favorecer as matérias de maior dificuldade.
 */
export function distributeMinutesByWeight(totalMinutes: number, weights: number[], minimumMinutes = 15, increment = 5) {
  if (!weights.length) return []

  const minimumTotal = minimumMinutes * weights.length
  if (totalMinutes < minimumTotal) return weights.map(() => 0)

  const positiveWeights = weights.map((weight) => Math.max(0, weight))
  const normalizedWeights = positiveWeights.some((weight) => weight > 0) ? positiveWeights : weights.map(() => 1)
  const weightTotal = normalizedWeights.reduce((sum, weight) => sum + weight, 0)
  const distributable = totalMinutes - minimumTotal
  const exactShares = normalizedWeights.map((weight) => distributable * (weight / weightTotal))
  const allocations = exactShares.map((share) => minimumMinutes + Math.floor(share / increment) * increment)
  let remaining = totalMinutes - allocations.reduce((sum, minutes) => sum + minutes, 0)
  const remainderOrder = exactShares
    .map((share, index) => ({ index, remainder: share % increment }))
    .sort((a, b) => b.remainder - a.remainder)

  for (const { index } of remainderOrder) {
    if (remaining < increment) break
    allocations[index] += increment
    remaining -= increment
  }
  if (remaining > 0) allocations[remainderOrder[0]?.index ?? 0] += remaining

  return allocations
}
