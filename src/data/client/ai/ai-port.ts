import type { MaintenanceSuggestion } from '@/data/shared/maintenance-suggestion'

export interface SuggestionRequest {
  generatorModel: string
  description?: string
  locale: 'en' | 'uk'
}

export type SuggestionPlan = MaintenanceSuggestion

export interface AlertPromptCopy {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

export interface AlertErrorCopy {
  title: string
  message: string
}

export interface OrchestratorCopy {
  offline: AlertErrorCopy
  timeoutMessage: string
  fallbackErrorMessage: string
  errorTitle: string
  genericPrompt: AlertPromptCopy
}

export interface AIPort {
  checkConnectivity(): Promise<boolean>
  requestPlan(
    req: SuggestionRequest,
    signal: AbortSignal
  ): Promise<SuggestionPlan>
  alertPrompt(copy: AlertPromptCopy): Promise<boolean>
  alertError(copy: AlertErrorCopy): Promise<void>
  sleep(ms: number, signal: AbortSignal): Promise<void>
}

export type SuggestionResult =
  | { kind: 'offline' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string }
  | { kind: 'rejected-generic'; plan: SuggestionPlan }
  | { kind: 'accepted'; plan: SuggestionPlan }
