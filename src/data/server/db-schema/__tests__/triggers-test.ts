import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CUSTOM_TRIGGERS } from '../triggers'

const MIGRATIONS_DIR = join(__dirname, '../../migrations')
const CUSTOM_TRIGGER_PATTERN = /_custom_.*trigger.*\.sql$/

describe('CUSTOM_TRIGGERS drift guard', () => {
  const matchingFiles = readdirSync(MIGRATIONS_DIR)
    .filter(name => CUSTOM_TRIGGER_PATTERN.test(name))
    .sort()

  it('finds at least one custom trigger migration file', () => {
    expect(matchingFiles.length).toBeGreaterThanOrEqual(1)
  })

  it('CUSTOM_TRIGGERS is a non-empty string', () => {
    expect(typeof CUSTOM_TRIGGERS).toBe('string')
    expect(CUSTOM_TRIGGERS.length).toBeGreaterThan(0)
  })

  it('CUSTOM_TRIGGERS contains the full contents of every matching file', () => {
    for (const name of matchingFiles) {
      const contents = readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
      expect(CUSTOM_TRIGGERS).toContain(contents)
    }
  })
})
