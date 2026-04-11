import { createAuthzChecks } from '@/data/shared/authz'

import { clientAuthzProvider } from './provider'

const checks = createAuthzChecks(clientAuthzProvider)

export const { isOrgAdmin } = checks
