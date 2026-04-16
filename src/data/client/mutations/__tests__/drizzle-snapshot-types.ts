// Shared TypeScript shapes for the Drizzle-kit snapshot returned by
// `generateDrizzleJson(schema)`. drizzle-kit does not export these types,
// so this file is the single source of truth for every test that walks
// the snapshot (constraint mirroring, drift guards, cascade conformance).

export interface SnapshotUniqueConstraint {
  name: string
  columns: string[]
}

export interface SnapshotIndexColumn {
  expression: string
}

export interface SnapshotIndex {
  name: string
  columns: SnapshotIndexColumn[]
  isUnique: boolean
  where?: string
}

export interface SnapshotForeignKey {
  tableFrom: string
  tableTo: string
  columnsFrom: string[]
  columnsTo: string[]
  onDelete: string
}

export interface SnapshotTable {
  name: string
  uniqueConstraints?: Record<string, SnapshotUniqueConstraint>
  indexes?: Record<string, SnapshotIndex>
  foreignKeys?: Record<string, SnapshotForeignKey>
}
