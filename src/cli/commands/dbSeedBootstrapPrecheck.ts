import {
  assertSeedBootstrapPrecheck,
  type SeedBootstrapPrecheckOptions,
} from "../utils/SeedBootstrapPrecheck.js";

export async function dbSeedBootstrapPrecheck(
  options: SeedBootstrapPrecheckOptions = {}
): Promise<void> {
  await assertSeedBootstrapPrecheck(options);
}

