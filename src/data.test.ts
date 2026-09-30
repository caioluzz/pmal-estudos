import { describe, expect, it } from 'vitest'
import { disciplines, editalSoldado, migrateDisciplines, migrateEdictSections } from './data'
import type { Discipline, EdictSection } from './types'

describe('conteúdo de Direito Penal', () => {
  it('mantém Direito Penal separado de Legislação nos dados iniciais', () => {
    expect(disciplines.some((discipline) => discipline.id === 'penal')).toBe(true)
    expect(editalSoldado.find((section) => section.id === 'legislacao')?.topics)
      .not.toContainEqual(expect.objectContaining({ title: expect.stringContaining('Código Penal') }))
    expect(editalSoldado.find((section) => section.id === 'penal')?.topics)
      .toContainEqual(expect.objectContaining({ title: expect.stringContaining('Código Penal') }))
  })

  it('inclui a nova matéria em uma lista persistida antiga', () => {
    const oldDisciplines: Discipline[] = disciplines.filter((discipline) => discipline.id !== 'penal')
    const migrated = migrateDisciplines(oldDisciplines)

    expect(migrated.findIndex((discipline) => discipline.id === 'penal'))
      .toBe(migrated.findIndex((discipline) => discipline.id === 'processo-penal') - 1)
  })

  it('move o tópico antigo e preserva seu progresso', () => {
    const oldEdict: EdictSection[] = editalSoldado
      .filter((section) => section.id !== 'penal')
      .map((section) => section.id !== 'legislacao' ? section : {
        ...section,
        topics: [
          ...section.topics.slice(0, 2),
          { id: 'leg-3', title: 'Código Penal — Parte Geral, Títulos I a III', status: 'Revisado' },
          ...section.topics.slice(2),
        ],
      })

    const migrated = migrateEdictSections(oldEdict)

    expect(migrated.find((section) => section.id === 'legislacao')?.topics.some((topic) => topic.id === 'leg-3')).toBe(false)
    expect(migrated.find((section) => section.id === 'penal')?.topics[0]).toMatchObject({ id: 'dp-1', status: 'Revisado' })
  })
})
