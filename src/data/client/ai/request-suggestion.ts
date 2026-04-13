import type {
  AIPort,
  OrchestratorCopy,
  SuggestionPlan,
  SuggestionRequest,
  SuggestionResult
} from './ai-port'

const DEFAULT_TIMEOUT_MS = 45_000

export async function requestSuggestion(opts: {
  request: SuggestionRequest
  port: AIPort
  copy: OrchestratorCopy
  signal: AbortSignal
  timeoutMs?: number
}): Promise<SuggestionResult> {
  const { request, port, copy, signal } = opts
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (signal.aborted) return { kind: 'cancelled' }

  const online = await port.checkConnectivity()
  if (signal.aborted) return { kind: 'cancelled' }
  if (!online) {
    await port.alertError(copy.offline)
    return { kind: 'offline' }
  }

  const child = new AbortController()
  const forwardAbort = () => child.abort()
  signal.addEventListener('abort', forwardAbort)

  let plan: SuggestionPlan
  try {
    plan = await raceWithTimeout(port, request, child, timeoutMs, copy)
  } catch (err) {
    signal.removeEventListener('abort', forwardAbort)
    if (signal.aborted) return { kind: 'cancelled' }
    const message =
      err instanceof Error && err.message
        ? err.message
        : copy.fallbackErrorMessage
    await port.alertError({ title: copy.errorTitle, message })
    return { kind: 'failed', message }
  }
  signal.removeEventListener('abort', forwardAbort)

  if (signal.aborted) return { kind: 'cancelled' }
  if (!plan.isGeneric) return { kind: 'accepted', plan }

  const confirmed = await port.alertPrompt(copy.genericPrompt)
  if (signal.aborted) return { kind: 'cancelled' }
  if (confirmed) return { kind: 'accepted', plan }
  return { kind: 'rejected-generic', plan }
}

type RaceOutcome = { kind: 'plan'; plan: SuggestionPlan } | { kind: 'timeout' }

async function raceWithTimeout(
  port: AIPort,
  request: SuggestionRequest,
  child: AbortController,
  timeoutMs: number,
  copy: OrchestratorCopy
): Promise<SuggestionPlan> {
  const planPromise: Promise<RaceOutcome> = port
    .requestPlan(request, child.signal)
    .then(plan => ({ kind: 'plan', plan }))
  const timeoutPromise: Promise<RaceOutcome> = port
    .sleep(timeoutMs, child.signal)
    .then(() => ({ kind: 'timeout' }))

  // Prevent unhandled rejection from the loser once the race resolves.
  planPromise.catch(() => {})
  timeoutPromise.catch(() => {})

  const outcome = await Promise.race([planPromise, timeoutPromise])
  child.abort()
  if (outcome.kind === 'timeout') throw new Error(copy.timeoutMessage)
  return outcome.plan
}
