import {
  type LocalIdentity,
  clearLocalIdentity,
  getLocalIdentity,
  persistLocalIdentity
} from '../offline-identity'

export interface IdentityStorage {
  read: () => Promise<LocalIdentity | null>
  write: (userId: string) => Promise<LocalIdentity>
  clear: () => Promise<void>
}

export const defaultIdentityStorage: IdentityStorage = {
  read: getLocalIdentity,
  write: persistLocalIdentity,
  clear: clearLocalIdentity
}
