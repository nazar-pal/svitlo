import fs from 'node:fs'
import path from 'node:path'

const HANDLERS_DIR = path.resolve(__dirname, '../handlers')

const UPDATE_VALIDATION: Record<string, 'zod' | 'manual-exempt'> = {
  generators: 'zod',
  organizations: 'zod',
  'maintenance-templates': 'zod',
  'maintenance-records': 'manual-exempt',
  user: 'manual-exempt',
  sessions: 'manual-exempt'
}

const NO_UPDATE_HANDLERS = ['invitations', 'members', 'assignments']

function readHandler(filename: string): string {
  return fs.readFileSync(path.join(HANDLERS_DIR, `${filename}.ts`), 'utf-8')
}

describe('update validation conformance', () => {
  for (const [handler, strategy] of Object.entries(UPDATE_VALIDATION)) {
    if (strategy === 'zod') {
      it(`${handler} validates updates via Zod safeParse`, () => {
        const source = readHandler(handler)
        expect(source).toContain('.safeParse(')
      })
    }
  }

  for (const handler of NO_UPDATE_HANDLERS) {
    it(`${handler} has no update branch`, () => {
      const source = readHandler(handler)
      expect(source).not.toMatch(/op\s*===?\s*['"]update['"]/)
    })
  }

  it('every handler with an update branch is in the registry', () => {
    const allHandlerFiles = fs
      .readdirSync(HANDLERS_DIR)
      .filter(
        f =>
          f.endsWith('.ts') &&
          !['types.ts', 'index.ts', 'replay.ts', 'checks.ts'].includes(f)
      )
      .map(f => f.replace('.ts', ''))

    for (const handler of allHandlerFiles) {
      const source = readHandler(handler)
      const hasUpdate = /op\s*===?\s*['"]update['"]/.test(source)
      if (!hasUpdate) continue

      const isRegistered =
        handler in UPDATE_VALIDATION || NO_UPDATE_HANDLERS.includes(handler)
      expect({
        handler,
        registered: isRegistered
      }).toEqual({ handler, registered: true })
    }
  })
})
