import { randomUUID } from 'expo-crypto'

export { fail, ok, type MutationResult } from '@/data/shared/result'

export const newId = () => randomUUID()

export const nowISO = () => new Date().toISOString()
