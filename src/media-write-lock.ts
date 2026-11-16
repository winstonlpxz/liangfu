const processState = globalThis as typeof globalThis & {
  liangfuMediaWriteQueue?: Promise<unknown>
}

export async function withMediaWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = (processState.liangfuMediaWriteQueue ?? Promise.resolve()).then(operation)
  processState.liangfuMediaWriteQueue = next.catch(() => undefined)
  return next
}
