type ConsoleLogMethod = (...args: unknown[]) => void;

/**
 * Temporarily silences non-error console output for command runtime.
 * Returns a restore callback that must always be called (typically in finally).
 */
export function silenceConsoleOutput(enabled: boolean): () => void {
  if (!enabled) {
    return () => undefined;
  }

  const originalLog: ConsoleLogMethod = console.log.bind(console);
  const originalInfo: ConsoleLogMethod = console.info.bind(console);
  const originalWarn: ConsoleLogMethod = console.warn.bind(console);
  const noop: ConsoleLogMethod = () => undefined;

  console.log = noop;
  console.info = noop;
  console.warn = noop;

  return () => {
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
  };
}
