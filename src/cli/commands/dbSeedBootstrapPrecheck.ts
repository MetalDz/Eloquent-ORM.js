import {
  assertSeedBootstrapPrecheck,
  type SeedBootstrapPrecheckOptions,
} from "../utils/SeedBootstrapPrecheck";

export async function dbSeedBootstrapPrecheck(
  options: SeedBootstrapPrecheckOptions = {}
): Promise<void> {
  await assertSeedBootstrapPrecheck(options);
}

