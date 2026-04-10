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
