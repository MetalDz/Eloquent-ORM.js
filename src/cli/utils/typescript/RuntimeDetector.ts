/**
 * 🧠 RuntimeDetector
 * Lightweight helper that determines if a given CLI command
 * requires TypeScript runtime initialization (ts-node).
 *
 * Avoids unnecessary ts-node overhead for simple commands
 * like cache:clear, cache:stats, or migrate:status.
 */
export class RuntimeDetector {
  /**
   * 🔍 Checks CLI args and decides if ts-node runtime is required.
   * Includes detailed DEBUG logging for developer insights.
   */
  static needsTypeScriptRuntime(argv: string[] = process.argv): boolean {
    // 🧩 Commands that rely on .ts file parsing or schema building
    const heavyPrefixes = ["make:", "migrate:", "seed:", "factory:"];

    // ⚡ Commands that never need ts-node (pure JS ops)
    const skipPatterns = ["cache:", "list", "--help", "-h"];

    // Detect match
    const matched = argv.find(arg => heavyPrefixes.some(prefix => arg.includes(prefix)));
    const skipped = argv.find(arg => skipPatterns.some(skip => arg.includes(skip)));

    // 🧠 DEBUG feedback (optional developer insight)
    if (process.env.DEBUG === "true") {
      console.log("────────────── RuntimeDetector ──────────────");
      console.log(`argv: ${argv.join(" ")}`);
      if (matched) {
        console.log(`🧠 [RuntimeDetector] TS runtime needed (matched command: ${matched})`);
      } else if (skipped) {
        console.log(`⚡ [RuntimeDetector] Runtime skipped (matched command: ${skipped})`);
      } else {
        console.log(`⚙️ [RuntimeDetector] Default behavior — runtime not needed.`);
      }
      console.log("─────────────────────────────────────────────\n");
    }

    // ✅ Require runtime only if command matches heavy prefix and not skip list
    return Boolean(matched && !skipped);
  }
}
