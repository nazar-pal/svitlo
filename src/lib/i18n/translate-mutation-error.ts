import type { MutationError } from '@/data/shared/errors'

import { t } from './index'

/**
 * Sole place where a `MutationError` is converted into a user-facing string.
 *
 * The switch is exhaustive — adding a new code to `MutationErrorParamMap`
 * without updating this function is a compile error via the `never` guard.
 */
export function translateMutationError(error: MutationError): string {
  switch (error.code) {
    // Not-found
    case 'GENERATOR_NOT_FOUND':
      return t('errors.generatorNotFound')
    case 'SESSION_NOT_FOUND':
      return t('errors.sessionNotFound')
    case 'TEMPLATE_NOT_FOUND':
      return t('errors.templateNotFound')
    case 'MAINTENANCE_TEMPLATE_NOT_FOUND':
      return t('errors.maintenanceTemplateNotFound')
    case 'RECORD_NOT_FOUND':
      return t('errors.recordNotFound')
    case 'MEMBER_NOT_FOUND':
      return t('errors.memberNotFound')
    case 'NOT_MEMBER_OF_ORG':
      return t('errors.notMemberOfOrg')
    case 'ORGANIZATION_NOT_FOUND':
      return t('errors.organizationNotFound')
    case 'INVITATION_NOT_FOUND':
      return t('errors.invitationNotFound')

    // Authz
    case 'ONLY_ADMIN_CAN_UPDATE_GENERATORS':
      return t('errors.onlyAdminCanUpdateGenerators')
    case 'ONLY_ADMIN_CAN_CREATE_GENERATORS':
      return t('errors.onlyAdminCanCreateGenerators')
    case 'ONLY_ADMIN_CAN_DELETE_GENERATORS':
      return t('errors.onlyAdminCanDeleteGenerators')
    case 'ONLY_ADMIN_CAN_CREATE_TEMPLATES':
      return t('errors.onlyAdminCanCreateTemplates')
    case 'ONLY_ADMIN_CAN_UPDATE_TEMPLATES':
      return t('errors.onlyAdminCanUpdateTemplates')
    case 'ONLY_ADMIN_CAN_DELETE_TEMPLATES':
      return t('errors.onlyAdminCanDeleteTemplates')
    case 'ONLY_ADMIN_CAN_REMOVE_MEMBERS':
      return t('errors.onlyAdminCanRemoveMembers')
    case 'ONLY_ADMIN_CAN_ASSIGN_USERS':
      return t('errors.onlyAdminCanAssignUsers')
    case 'ONLY_ADMIN_CAN_UNASSIGN_USERS':
      return t('errors.onlyAdminCanUnassignUsers')
    case 'ONLY_ADMIN_CAN_INVITE':
      return t('errors.onlyAdminCanInvite')
    case 'ONLY_ADMIN_CAN_CANCEL_INVITATIONS':
      return t('errors.onlyAdminCanCancelInvitations')
    case 'ONLY_ADMIN_CAN_RENAME_ORG':
      return t('errors.onlyAdminCanRenameOrg')
    case 'ONLY_ADMIN_CAN_DELETE_ORG':
      return t('errors.onlyAdminCanDeleteOrg')
    case 'NOT_AUTHORIZED_FOR_GENERATOR':
      return t('errors.notAuthorizedForGenerator')
    case 'ADMIN_CANNOT_LEAVE':
      return t('errors.adminCannotLeave')
    case 'INVITATION_NOT_FOR_YOU':
      return t('errors.invitationNotForYou')

    // State / business rules
    case 'GENERATOR_ALREADY_ACTIVE':
      return t('errors.generatorAlreadyActive')
    case 'CANNOT_DELETE_ACTIVE_SESSION':
      return t('errors.cannotDeleteActiveSession')
    case 'CANNOT_EDIT_ACTIVE_SESSION':
      return t('errors.cannotEditActiveSession')
    case 'SESSION_ALREADY_STOPPED':
      return t('errors.sessionAlreadyStopped')
    case 'START_BEFORE_END':
      return t('errors.startBeforeEnd')
    case 'END_TIME_IN_FUTURE':
      return t('errors.endTimeInFuture')
    case 'PERFORMED_TIME_IN_FUTURE':
      return t('errors.performedTimeInFuture')
    case 'HOURS_INTERVAL_REQUIRED':
      return t('errors.hoursIntervalRequired')
    case 'CALENDAR_DAYS_REQUIRED':
      return t('errors.calendarDaysRequired')
    case 'TEMPLATE_NOT_FOR_GENERATOR':
      return t('errors.templateNotForGenerator')
    case 'USER_NOT_ORG_MEMBER':
      return t('errors.userNotOrgMember')
    case 'USER_ALREADY_ASSIGNED':
      return t('errors.userAlreadyAssigned')
    case 'USER_NOT_ASSIGNED':
      return t('errors.userNotAssigned')
    case 'INVITATION_ALREADY_SENT':
      return t('errors.invitationAlreadySent')
    case 'ALREADY_MEMBER':
      return t('errors.alreadyMember')

    // Generic validation
    case 'MUST_NOT_BE_EMPTY':
      return t('validation.mustNotBeEmpty')
    case 'MUST_BE_POSITIVE':
      return t('validation.mustBePositive')
    case 'MUST_BE_POSITIVE_INT':
      return t('validation.mustBePositiveInt')
    case 'MIN_PERCENT':
      return t('validation.minPercent')
    case 'MAX_PERCENT':
      return t('validation.maxPercent')
    case 'AT_LEAST_ONE_FIELD':
      return t('validation.atLeastOneField')
    case 'MUST_BE_VALID_EMAIL':
      return t('validation.mustBeValidEmail')
    case 'REQUIRED_FOR_TRIGGER_TYPE':
      return t('validation.required')

    // Auth-specific validation
    case 'ENTER_EMAIL':
      return t('validation.enterEmail')
    case 'VALID_EMAIL':
      return t('validation.validEmail')
    case 'ENTER_PASSWORD':
      return t('validation.enterPassword')
    case 'ENTER_NAME':
      return t('validation.enterName')
    case 'PASSWORD_MIN_LENGTH':
      return t('validation.passwordMinLength')
    case 'PASSWORDS_DO_NOT_MATCH':
      return t('validation.passwordsDoNotMatch')

    // Parameterized
    case 'MAINTENANCE_TASK_VALIDATION_FAILED':
      return t('errors.maintenanceTaskValidationFailed', {
        taskName: error.params.taskName
      })
    case 'AUTH_FAILED':
      return error.params.message

    default:
      throw new Error(
        `unhandled mutation error: ${JSON.stringify(error satisfies never)}`
      )
  }
}
