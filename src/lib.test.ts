import { describe, expect, it } from 'vitest'
import { distributeMinutesByWeight, formatHours, formatStudySeconds, greetingForHour, runningTimerSeconds, studySecondsForMission, studySecondsOnDate } from './lib'
import type { StudySession } from './types'

describe('distribuição do tempo das missões', () => {
  it('preenche toda a capacidade e favorece a maior dificuldade', () => {
    const result = distributeMinutesByWeight(240, [45, 30])

    expect(result).toEqual([140, 100])
    expect(result.reduce((sum, minutes) => sum + minutes, 0)).toBe(240)
  })

  it('divide igualmente entre matérias da mesma dificuldade', () => {
    expect(distributeMinutesByWeight(240, [60, 60])).toEqual([120, 120])
  })

  it('não cria blocos menores que o mínimo', () => {
    expect(distributeMinutesByWeight(20, [60, 45])).toEqual([0, 0])
  })
})

describe('cronômetro persistente', () => {
  it('recupera o tempo transcorrido enquanto a tela ficou fechada', () => {
    expect(runningTimerSeconds(90, 1_000, 16_500)).toBe(105)
  })

  it('não acrescenta tempo quando está pausado', () => {
    expect(runningTimerSeconds(90, null, 16_500)).toBe(90)
  })
})

describe('saudação por horário', () => {
  it('usa manhã, tarde e noite nos intervalos corretos', () => {
    expect(greetingForHour(5)).toBe('Bom dia')
    expect(greetingForHour(11)).toBe('Bom dia')
    expect(greetingForHour(12)).toBe('Boa tarde')
    expect(greetingForHour(16)).toBe('Boa tarde')
    expect(greetingForHour(17)).toBe('Boa tarde')
    expect(greetingForHour(18)).toBe('Boa noite')
    expect(greetingForHour(0)).toBe('Boa noite')
  })
})

describe('tempo realizado', () => {
  const sessions: StudySession[] = [
    { id: 's1', disciplineId: 'matematica', missionId: 'm1', seconds: 2_460, date: '2026-09-23', notes: '' },
    { id: 's2', disciplineId: 'matematica', missionId: 'm1', seconds: 1_800, date: '2026-09-23', notes: '' },
    { id: 's3', disciplineId: 'portugues', missionId: 'm2', seconds: 900, date: '2026-09-22', notes: '' },
  ]

  it('soma todas as sessões ligadas à mesma missão', () => {
    expect(studySecondsForMission(sessions, 'm1')).toBe(4_260)
  })

  it('soma apenas o tempo estudado na data informada', () => {
    expect(studySecondsOnDate(sessions, '2026-09-23')).toBe(4_260)
  })

  it('formata o gráfico em horas e a sessão em horas e minutos', () => {
    expect(formatHours(267)).toBe('4,45h')
    expect(formatHours(1 / 60)).toBe('<0,01h')
    expect(formatStudySeconds(4_260)).toBe('1h 11min')
  })
})
