export function getUserName(
  users: { id: string; name: string }[],
  userId: string
): string {
  return users.find(u => u.id === userId)?.name || 'Unknown'
}
