import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findCell, findFunction } from '../../lib/matlab'
import { allLabs, courses, getCourse, getLab, labPath, legacyLabPath, sectionHref } from '../registry'

const PREFIX = { 'traitement-du-signal': 'ts-', automatique: 'ae-' } as const
const matlabPath = (file: string) => fileURLToPath(new URL(`../../../public/matlab/${file}`, import.meta.url))

describe('registry: courses → labs → sections', () => {
  it('has the two courses, in order, with their TPs', () => {
    expect(courses.map((c) => c.id)).toEqual(['traitement-du-signal', 'automatique'])
    expect(getCourse('traitement-du-signal')!.labs.map((l) => l.id)).toEqual(['ts-tp1', 'ts-tp2', 'ts-tp3', 'ts-tp4'])
    expect(getCourse('automatique')!.labs.map((l) => l.id)).toEqual(['ae-tp3', 'ae-tp4'])
  })

  it('lab ids are unique site-wide and always carry the course prefix', () => {
    const ids = allLabs.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const course of courses) {
      for (const lab of course.labs) {
        expect(lab.course).toBe(course.id)
        expect(lab.id).toBe(`${PREFIX[course.id]}${lab.slug}`)
        expect(lab.id).not.toMatch(/^tp\d+$/)
      }
    }
  })

  it('both TP 3 are distinct and reachable by course', () => {
    expect(getLab('traitement-du-signal', 'tp3')!.id).toBe('ts-tp3')
    expect(getLab('automatique', 'tp3')!.id).toBe('ae-tp3')
    expect(getLab('automatique', 'tp1')).toBeUndefined()
    expect(getLab('nope', 'tp1')).toBeUndefined()
  })

  it('builds the new routes', () => {
    expect(labPath(getLab('traitement-du-signal', 'tp1')!)).toBe('/traitement-du-signal/tp1')
    expect(labPath(getLab('automatique', 'tp4')!)).toBe('/automatique/tp4')
    expect(sectionHref(getLab('traitement-du-signal', 'tp2')!, 'animateur')).toBe('/traitement-du-signal/tp2?s=animateur')
  })

  it('redirects the old single-course routes to Traitement du signal', () => {
    expect(legacyLabPath('tp1')).toBe('/traitement-du-signal/tp1')
    expect(legacyLabPath('tp2')).toBe('/traitement-du-signal/tp2')
    expect(legacyLabPath('tp3')).toBe('/traitement-du-signal/tp3')
    expect(legacyLabPath('tp4')).toBeUndefined()
    expect(legacyLabPath(undefined)).toBeUndefined()
  })

  it('section ids are unique within each lab', () => {
    for (const lab of allLabs) {
      const ids = lab.sections.map((s) => s.id)
      expect(new Set(ids).size, lab.id).toBe(ids.length)
    }
  })

  it('every .m file lives in its course folder of public/matlab/', () => {
    for (const lab of allLabs.filter((l) => l.matlabFile)) {
      expect(lab.matlabFile!.startsWith(`${lab.course}/`), lab.id).toBe(true)
      expect(existsSync(matlabPath(lab.matlabFile!)), lab.matlabFile).toBe(true)
    }
  })

  it('placeholder sections (not written yet) match the "%%" cells of their .m file', () => {
    for (const lab of getCourse('automatique')!.labs) {
      const source = readFileSync(matlabPath(lab.matlabFile!), 'utf8')
      for (const s of lab.sections.filter((x) => !x.component)) expect(findCell(source, s.number), `${lab.id} ${s.number}`).toBeDefined()
    }
  })

  it('every cell shown in the TP3 / TP4 code tabs exists in its .m file', () => {
    const cells: Record<string, string[]> = {
      'traitement-du-signal/tp3_tfd.m': ['Q1', 'Q2', 'Q3', 'Q4', 'Q5-6', 'Q7-8', 'Q9-10', 'Q11', 'Q12'],
      'traitement-du-signal/tp4_filtres.m': ['I.1', 'I.2', 'I.3', 'I.4', 'I.5', 'II'],
      'automatique/tp3_stabilite_precision.m': ['II.3-4', 'II.5', 'II.6', 'II.7', 'III.1-2', 'III.3', 'III.4', 'III.5', 'III.6'],
      'automatique/tp4_pid.m': ['III.1', 'III.1-2', 'III.3', 'III.4', 'IV', 'IV.7', 'IV.8'],
    }
    for (const [file, list] of Object.entries(cells)) {
      const source = readFileSync(matlabPath(file), 'utf8')
      for (const cell of list) expect(findCell(source, cell), `${file} ${cell}`).toBeDefined()
    }
    const tfd = readFileSync(matlabPath('traitement-du-signal/tp3_tfd.m'), 'utf8')
    expect(findFunction(tfd, 'puissance2')).toBeDefined()
    // "Q1" must not pick up "Q11"
    expect(findCell(tfd, 'Q1')!.title.startsWith('Q1 ')).toBe(true)
  })
})
