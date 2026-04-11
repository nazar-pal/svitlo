// Fact shapes the member-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

// `id` is the membership row id — both entry points (admin-removes and
// self-leaves) need it for the downstream transfer-and-delete side effect,
// so carrying it on MemberRef lets the policy result be a single shape.
export interface MemberRef {
  id: string
  organizationId: string
  userId: string
}

export interface OrgAdminRef {
  adminUserId: string
}

// Port: adapters answer "is this membership row present" and
// "who is the admin of this org". Both client (SQLite) and server (Postgres)
// implement it against their own dialect.
export interface MemberFactsProvider {
  findMembershipById(memberId: string): Promise<MemberRef | null>
  findMembershipByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<MemberRef | null>
  findOrgAdmin(organizationId: string): Promise<OrgAdminRef | null>
}
