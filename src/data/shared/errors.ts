// Per-code params map. `undefined` means the code takes no params.
// Adding a code here is the single source of truth — the discriminated
// union below derives from this, and translate-mutation-error.ts
// exhaustively handles every key.
export interface MutationErrorParamMap {
  // Not-found
  GENERATOR_NOT_FOUND: undefined
  SESSION_NOT_FOUND: undefined
  TEMPLATE_NOT_FOUND: undefined
  MAINTENANCE_TEMPLATE_NOT_FOUND: undefined
  RECORD_NOT_FOUND: undefined
  MEMBER_NOT_FOUND: undefined
  NOT_MEMBER_OF_ORG: undefined
  ORGANIZATION_NOT_FOUND: undefined
  INVITATION_NOT_FOUND: undefined

  // Authz
  ONLY_ADMIN_CAN_UPDATE_GENERATORS: undefined
  ONLY_ADMIN_CAN_CREATE_GENERATORS: undefined
  ONLY_ADMIN_CAN_DELETE_GENERATORS: undefined
  ONLY_ADMIN_CAN_CREATE_TEMPLATES: undefined
  ONLY_ADMIN_CAN_UPDATE_TEMPLATES: undefined
  ONLY_ADMIN_CAN_DELETE_TEMPLATES: undefined
  ONLY_ADMIN_CAN_REMOVE_MEMBERS: undefined
  ONLY_ADMIN_CAN_ASSIGN_USERS: undefined
  ONLY_ADMIN_CAN_UNASSIGN_USERS: undefined
  ONLY_ADMIN_CAN_INVITE: undefined
  ONLY_ADMIN_CAN_CANCEL_INVITATIONS: undefined
  ONLY_ADMIN_CAN_RENAME_ORG: undefined
  ONLY_ADMIN_CAN_DELETE_ORG: undefined
  NOT_AUTHORIZED_FOR_GENERATOR: undefined
  ADMIN_CANNOT_LEAVE: undefined
  INVITATION_NOT_FOR_YOU: undefined

  // State / business rules
  GENERATOR_ALREADY_ACTIVE: undefined
  CANNOT_DELETE_ACTIVE_SESSION: undefined
  CANNOT_EDIT_ACTIVE_SESSION: undefined
  SESSION_ALREADY_STOPPED: undefined
  START_BEFORE_END: undefined
  END_TIME_IN_FUTURE: undefined
  PERFORMED_TIME_IN_FUTURE: undefined
  HOURS_INTERVAL_REQUIRED: undefined
  CALENDAR_DAYS_REQUIRED: undefined
  TEMPLATE_NOT_FOR_GENERATOR: undefined
  USER_NOT_ORG_MEMBER: undefined
  USER_ALREADY_ASSIGNED: undefined
  USER_NOT_ASSIGNED: undefined
  INVITATION_ALREADY_SENT: undefined
  ALREADY_MEMBER: undefined

  // Generic validation (emitted by validate-with-zod for field errors)
  MUST_NOT_BE_EMPTY: undefined
  MUST_BE_POSITIVE: undefined
  MUST_BE_POSITIVE_INT: undefined
  MIN_PERCENT: undefined
  MAX_PERCENT: undefined
  AT_LEAST_ONE_FIELD: undefined
  MUST_BE_VALID_EMAIL: undefined
  REQUIRED_FOR_TRIGGER_TYPE: undefined

  // Auth-specific validation (preserves per-field wording)
  ENTER_EMAIL: undefined
  VALID_EMAIL: undefined
  ENTER_PASSWORD: undefined
  ENTER_NAME: undefined
  PASSWORD_MIN_LENGTH: undefined
  PASSWORDS_DO_NOT_MATCH: undefined

  // Parameterized
  MAINTENANCE_TASK_VALIDATION_FAILED: { taskName: string }
  // Wraps a pre-translated error string from an external auth provider
  // (e.g. Better Auth). The message is already localized by the provider
  // and is surfaced verbatim — see translate-mutation-error.ts.
  AUTH_FAILED: { message: string }
}

export type MutationErrorCode = keyof MutationErrorParamMap

// Discriminated union: entries with `undefined` params become bare,
// entries with typed params require the params field. This enforces
// at compile time that `fail('MAINTENANCE_TASK_VALIDATION_FAILED')` is
// an error without `{ taskName }`.
export type MutationError = {
  [K in MutationErrorCode]: MutationErrorParamMap[K] extends undefined
    ? { code: K }
    : { code: K; params: MutationErrorParamMap[K] }
}[MutationErrorCode]

// Subset of codes that take no params — the only codes a Zod schema may
// legally embed via `{ error: 'CODE' }` (parameterized codes can't be
// constructed from a schema because the schema has no way to supply params).
export type ParamFreeMutationErrorCode = {
  [K in MutationErrorCode]: MutationErrorParamMap[K] extends undefined
    ? K
    : never
}[MutationErrorCode]

// Runtime mirror of `ParamFreeMutationErrorCode`. The explicit
// `Record<ParamFreeMutationErrorCode, true>` annotation enforces exact
// exhaustiveness: adding a param-free code to `MutationErrorParamMap`
// without adding it here is a compile error, and vice-versa. This is the
// sole runtime list — `errors-from-zod.ts` reads from it.
export const PARAM_FREE_MUTATION_ERROR_CODES: Readonly<
  Record<ParamFreeMutationErrorCode, true>
> = {
  GENERATOR_NOT_FOUND: true,
  SESSION_NOT_FOUND: true,
  TEMPLATE_NOT_FOUND: true,
  MAINTENANCE_TEMPLATE_NOT_FOUND: true,
  RECORD_NOT_FOUND: true,
  MEMBER_NOT_FOUND: true,
  NOT_MEMBER_OF_ORG: true,
  ORGANIZATION_NOT_FOUND: true,
  INVITATION_NOT_FOUND: true,

  ONLY_ADMIN_CAN_UPDATE_GENERATORS: true,
  ONLY_ADMIN_CAN_CREATE_GENERATORS: true,
  ONLY_ADMIN_CAN_DELETE_GENERATORS: true,
  ONLY_ADMIN_CAN_CREATE_TEMPLATES: true,
  ONLY_ADMIN_CAN_UPDATE_TEMPLATES: true,
  ONLY_ADMIN_CAN_DELETE_TEMPLATES: true,
  ONLY_ADMIN_CAN_REMOVE_MEMBERS: true,
  ONLY_ADMIN_CAN_ASSIGN_USERS: true,
  ONLY_ADMIN_CAN_UNASSIGN_USERS: true,
  ONLY_ADMIN_CAN_INVITE: true,
  ONLY_ADMIN_CAN_CANCEL_INVITATIONS: true,
  ONLY_ADMIN_CAN_RENAME_ORG: true,
  ONLY_ADMIN_CAN_DELETE_ORG: true,
  NOT_AUTHORIZED_FOR_GENERATOR: true,
  ADMIN_CANNOT_LEAVE: true,
  INVITATION_NOT_FOR_YOU: true,

  GENERATOR_ALREADY_ACTIVE: true,
  CANNOT_DELETE_ACTIVE_SESSION: true,
  CANNOT_EDIT_ACTIVE_SESSION: true,
  SESSION_ALREADY_STOPPED: true,
  START_BEFORE_END: true,
  END_TIME_IN_FUTURE: true,
  PERFORMED_TIME_IN_FUTURE: true,
  HOURS_INTERVAL_REQUIRED: true,
  CALENDAR_DAYS_REQUIRED: true,
  TEMPLATE_NOT_FOR_GENERATOR: true,
  USER_NOT_ORG_MEMBER: true,
  USER_ALREADY_ASSIGNED: true,
  USER_NOT_ASSIGNED: true,
  INVITATION_ALREADY_SENT: true,
  ALREADY_MEMBER: true,

  MUST_NOT_BE_EMPTY: true,
  MUST_BE_POSITIVE: true,
  MUST_BE_POSITIVE_INT: true,
  MIN_PERCENT: true,
  MAX_PERCENT: true,
  AT_LEAST_ONE_FIELD: true,
  MUST_BE_VALID_EMAIL: true,
  REQUIRED_FOR_TRIGGER_TYPE: true,

  ENTER_EMAIL: true,
  VALID_EMAIL: true,
  ENTER_PASSWORD: true,
  ENTER_NAME: true,
  PASSWORD_MIN_LENGTH: true,
  PASSWORDS_DO_NOT_MATCH: true
}
