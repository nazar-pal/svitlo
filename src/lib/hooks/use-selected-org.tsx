import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

import { useUserOrgs } from '@/lib/hooks/use-user-orgs'
import { storage } from '@/lib/storage'

interface SelectedOrgContextValue {
  selectedOrgId: string | null
  setSelectedOrgId: (id: string | null) => void
}

const SelectedOrgContext = createContext<SelectedOrgContextValue>({
  selectedOrgId: null,
  setSelectedOrgId: () => {}
})

const STORAGE_KEY = 'selected-org-id'

export function SelectedOrgProvider({ children }: { children: ReactNode }) {
  const { userOrgs } = useUserOrgs()
  const [storedOrgId, setStoredOrgId] = useState<string | null>(
    () => storage.getString(STORAGE_KEY) ?? null
  )

  const selectedOrgId =
    userOrgs.find(o => o.id === storedOrgId)?.id ?? userOrgs[0]?.id ?? null

  function setSelectedOrgId(id: string | null) {
    setStoredOrgId(id)
    if (id) storage.set(STORAGE_KEY, id)
    else storage.remove(STORAGE_KEY)
  }

  return (
    <SelectedOrgContext.Provider value={{ selectedOrgId, setSelectedOrgId }}>
      {children}
    </SelectedOrgContext.Provider>
  )
}

export function useSelectedOrg() {
  return useContext(SelectedOrgContext)
}
