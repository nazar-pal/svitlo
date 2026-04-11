// Fact shapes the assignment-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

// Port: anything that can answer these three questions is a valid fact source.
// `findGeneratorOrgId` returns `null` when the generator does not exist, and
// doubles as the "does generator exist?" probe — same pattern as sessions.
export interface AssignmentFactsProvider {
  findGeneratorOrgId(generatorId: string): Promise<string | null>
  isOrgMember(userId: string, organizationId: string): Promise<boolean>
  hasAssignment(userId: string, generatorId: string): Promise<boolean>
}
