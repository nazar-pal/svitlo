// Fact shapes the organization-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

// `adminUserId` lives on the ref so the delete side effect can carry the
// resolved org through to its caller without a second lookup, matching the
// shape of `RemoveMemberResult` in `@/data/shared/members`.
export interface OrganizationRef {
  id: string
  adminUserId: string
}

// Port: adapters answer "does this organization exist, and who is its admin".
// Both client (SQLite) and server (Postgres) implement it against their own
// dialect.
export interface OrganizationFactsProvider {
  findOrganization(id: string): Promise<OrganizationRef | null>
}
