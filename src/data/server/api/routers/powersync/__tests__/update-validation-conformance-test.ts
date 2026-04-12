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

const PIPELINE_SUPPORT_FILES = [
  'types.ts',
  'index.ts',
  'replay.ts',
  'checks.ts',
  'pipeline.ts'
]

function readHandler(filename: string): string {
  return fs.readFileSync(path.join(HANDLERS_DIR, `${filename}.ts`), 'utf-8')
}

function hasUpdateBranch(source: string): boolean {
  // Imperative: `if (op === 'update')`. Declarative: a top-level `update: {`
  // key inside `defineTableHandler(...)`.
  return (
    /op\s*===?\s*['"]update['"]/.test(source) || /\bupdate:\s*\{/.test(source)
  )
}

// Walk the source from `update:\s*{` and return the substring up to the
// matching close brace, skipping braces inside strings, template literals,
// and comments so a handler that later introduces a `{` in a literal doesn't
// silently break the conformance check.
function extractUpdateBlock(source: string): string | null {
  const match = source.match(/\bupdate:\s*\{/)
  if (!match || match.index === undefined) return null
  const start = match.index + match[0].length
  let depth = 1
  let i = start
  while (i < source.length) {
    const c = source[i]
    const next = source[i + 1]
    if (c === '/' && next === '/') {
      const nl = source.indexOf('\n', i + 2)
      i = nl === -1 ? source.length : nl + 1
      continue
    }
    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(source, i, c)
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return source.slice(start, i)
    }
    i++
  }
  return null
}

function skipString(source: string, start: number, quote: string): number {
  let i = start + 1
  while (i < source.length) {
    const c = source[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (quote === '`' && c === '$' && source[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < source.length && depth > 0) {
        const inner = source[i]
        if (inner === '{') depth++
        else if (inner === '}') depth--
        else if (inner === "'" || inner === '"' || inner === '`') {
          i = skipString(source, i, inner)
          continue
        }
        i++
      }
      continue
    }
    if (c === quote) return i + 1
    i++
  }
  return i
}

function validatesUpdates(source: string): boolean {
  // Imperative handlers call `updateXSchema.safeParse(...)` directly;
  // declarative handlers pass a schema via `schema:` inside the `update: {}`
  // block and rely on the pipeline to run safeParse.
  if (source.includes('.safeParse(')) return true
  const updateBlock = extractUpdateBlock(source)
  return updateBlock ? /\bschema:\s*update\w*Schema\b/.test(updateBlock) : false
}

describe('update validation conformance', () => {
  for (const [handler, strategy] of Object.entries(UPDATE_VALIDATION)) {
    if (strategy === 'zod') {
      it(`${handler} validates updates via Zod`, () => {
        const source = readHandler(handler)
        expect(validatesUpdates(source)).toBe(true)
      })
    }
  }

  for (const handler of NO_UPDATE_HANDLERS) {
    it(`${handler} has no update branch`, () => {
      const source = readHandler(handler)
      expect(hasUpdateBranch(source)).toBe(false)
    })
  }

  it('every handler with an update branch is in the registry', () => {
    const allHandlerFiles = fs
      .readdirSync(HANDLERS_DIR)
      .filter(f => f.endsWith('.ts') && !PIPELINE_SUPPORT_FILES.includes(f))
      .map(f => f.replace('.ts', ''))

    for (const handler of allHandlerFiles) {
      const source = readHandler(handler)
      if (!hasUpdateBranch(source)) continue

      const isRegistered =
        handler in UPDATE_VALIDATION || NO_UPDATE_HANDLERS.includes(handler)
      expect({
        handler,
        registered: isRegistered
      }).toEqual({ handler, registered: true })
    }
  })
})
