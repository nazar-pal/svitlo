// Fact shapes the invitation-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

export interface InvitationRef {
  organizationId: string
  inviteeEmail: string
}

// Port: adapters answer "is this invitation row present" and "does this
// user already belong to this org". Both client (SQLite) and server
// (Postgres) implement it against their own dialect.
export interface InvitationFactsProvider {
  findInvitationById(invitationId: string): Promise<InvitationRef | null>
  findInvitationByOrgAndEmail(
    organizationId: string,
    inviteeEmail: string
  ): Promise<InvitationRef | null>
  hasMembership(userId: string, organizationId: string): Promise<boolean>
}
