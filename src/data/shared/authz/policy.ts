// Pure authorization rules. No I/O. Callers fetch the data, then ask the
// policy. Both the client (PowerSync SQLite) and server (Postgres) reuse
// these so the rule lives in exactly one place.

export const isOrgAdmin = (
  userId: string,
  orgAdminUserId: string | null
): boolean => orgAdminUserId !== null && orgAdminUserId === userId

export const canAccessGenerator = (
  userId: string,
  orgAdminUserId: string | null,
  hasAssignment: boolean
): boolean => isOrgAdmin(userId, orgAdminUserId) || hasAssignment

// Payload the `authz.generator` fact resolver returns (the non-null branch).
// Declared at this pure base layer so the producers (server Postgres + client
// SQLite registries) and the consumers (domain decisions) reference one
// definition: renaming or dropping a field becomes a compile error at every
// site instead of silently drifting across the untyped fact-lookup boundary.
// Absence is composed per site (`| null` when the generator is missing,
// `| undefined` when the plan entry was skipped).
export interface GeneratorAuthzFact {
  orgAdminUserId: string | null
  hasAssignment: boolean
}

// Payload the `authz.org` fact resolver returns (the non-null branch), with
// the same single-definition rationale as `GeneratorAuthzFact` above.
export interface OrgAuthzFact {
  adminUserId: string | null
}

// Convenience over the raw `authz.generator` fact row, which is `undefined`
// when its plan entry was skipped and `null` when the generator was not
// found. Both cases fall back to the "no access" inputs.
export const canAccessGeneratorFact = (
  userId: string,
  fact: GeneratorAuthzFact | null | undefined
): boolean =>
  canAccessGenerator(
    userId,
    fact?.orgAdminUserId ?? null,
    fact?.hasAssignment ?? false
  )
