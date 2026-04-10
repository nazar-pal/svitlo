export type MutationResult = { ok: true } | { ok: false; error: string }

export const ok: MutationResult = { ok: true }

export const fail = (error: string): MutationResult => ({ ok: false, error })
