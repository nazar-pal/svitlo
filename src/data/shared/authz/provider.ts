// Fact shapes any authorization source must produce. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

export interface OrgAuthzFacts {
  adminUserId: string | null
}

export interface GeneratorAuthzFacts {
  // Nullable because generator → organization is a LEFT JOIN: an orphan
  // generator (generator row exists, org row does not) surfaces null here.
  orgAdminUserId: string | null
  hasAssignment: boolean
}

// Port: anything that can fetch the two fact shapes is a valid authz source.
// Returning `null` means "no such entity" — distinguishable from a present
// entity with a null admin.
export interface AuthzFactsProvider {
  getOrgFacts(orgId: string): Promise<OrgAuthzFacts | null>
  getGeneratorFacts(
    userId: string,
    generatorId: string
  ): Promise<GeneratorAuthzFacts | null>
}
