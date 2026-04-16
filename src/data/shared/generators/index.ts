import type { PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// Fact shape the generator-lifecycle policy needs. Adapters fetch raw rows
// and normalize into this schema-agnostic shape. Decisions in
// `./decisions.ts` wire the facts + authz providers to the inline rules.
export interface GeneratorRef {
  organizationId: string
}

// The generator rules are trivial ("is the row there? is the caller an
// admin?") so they live inline in `./decisions.ts` rather than as extracted
// pure-rule functions — unlike sessions + maintenance which have
// temporal/state-machine branches worth extracting. This file stays as a
// public export boundary for downstream imports.
