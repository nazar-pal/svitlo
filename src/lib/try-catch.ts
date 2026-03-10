type Success<T> = [null, T]
type Failure<E> = [E, null]
type Result<T, E> = Success<T> | Failure<E>

function formatError<E = Error>(error: unknown): E {
  if (error instanceof Error) return error as E
  if (typeof error === 'string') return new Error(error) as E
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return new Error(error.message) as E
  return new Error('Unknown error') as E
}

/**
 * Safely execute a synchronous function and return a result tuple.
 * @example const [error, data] = tryCatch(() => JSON.parse(raw))
 */
export function tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return [null, fn()]
  } catch (error) {
    return [formatError<E>(error), null]
  }
}

/**
 * Safely await a promise and return a result tuple.
 * @example const [error, data] = await asyncTryCatch(fetch('/api'))
 */
export async function asyncTryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    return [null, await promise]
  } catch (error) {
    return [formatError<E>(error), null]
  }
}
