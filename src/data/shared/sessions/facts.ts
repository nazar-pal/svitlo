// Fact shapes the session-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

export interface SessionRef {
  generatorId: string
  startedByUserId: string
  // Adapters normalize `stoppedAt IS NOT NULL` into this boolean so the
  // shared policy never has to know whether the underlying column is a
  // SQLite text timestamp or a Postgres `timestamptz`.
  isStopped: boolean
}

// Port: anything that can answer these three questions is a valid fact source.
// `findSession` returns `null` when the session does not exist.
export interface SessionFactsProvider {
  findSession(sessionId: string): Promise<SessionRef | null>
  generatorExists(generatorId: string): Promise<boolean>
  hasOpenSessionForGenerator(generatorId: string): Promise<boolean>
}
