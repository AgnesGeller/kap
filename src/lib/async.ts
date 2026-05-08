export async function withTimeout<T>(
  task: PromiseLike<T>,
  fallback: T,
  timeoutMs = 5000,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  const result = await Promise.race([Promise.resolve(task), timeout]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return result;
}
