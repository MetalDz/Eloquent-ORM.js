import {
  checkProductionDestructiveCommand,
  checkProductionTestOnlyCommand,
} from "./ProductionSafety";
import {
  defaultCliActionErrorRenderer,
  type CliActionErrorRenderer,
} from "./CliActionRuntime";

export type CliProductionOverrideOptions = {
  force?: boolean;
  yes?: boolean;
};

export type CliProductionTestOnlyOptions = {
  test?: boolean;
};

export function ensureCliProductionOverride(
  commandName: string,
  options: CliProductionOverrideOptions,
  renderError: CliActionErrorRenderer = defaultCliActionErrorRenderer
): boolean {
  const verdict = checkProductionDestructiveCommand({
    command: commandName,
    force: options.force === true,
    yes: options.yes === true,
  });

  if (verdict.allowed) {
    return true;
  }

  const reason = verdict.reason ?? `${commandName} is blocked in production.`;
  console.error(renderError(reason));
  process.exitCode = 1;
  return false;
}

export function ensureCliProductionTestOnly(
  commandName: string,
  options: CliProductionTestOnlyOptions,
  renderError: CliActionErrorRenderer = defaultCliActionErrorRenderer
): boolean {
  const verdict = checkProductionTestOnlyCommand({
    command: commandName,
    test: options.test === true,
  });

  if (verdict.allowed) {
    return true;
  }

  const reason = verdict.reason ?? `${commandName} requires --test in production.`;
  console.error(renderError(reason));
  process.exitCode = 1;
  return false;
}
