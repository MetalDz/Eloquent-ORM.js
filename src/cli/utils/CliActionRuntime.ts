export type CliActionErrorRenderer = (message: string) => string;

export function toCliActionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function defaultCliActionErrorRenderer(message: string): string {
  return `ERROR: ${message}`;
}

export async function runCliAction<T>(
  action: () => Promise<T> | T,
  renderError: CliActionErrorRenderer = defaultCliActionErrorRenderer
): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    console.error(renderError(toCliActionErrorMessage(error)));
    process.exitCode = 1;
    return undefined;
  }
}
