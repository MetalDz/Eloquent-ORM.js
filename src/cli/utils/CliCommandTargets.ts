import type { ConnectionName } from "../../core/connection/ConnectionFactory";
import {
  resolveConnectionNamesFromFlags,
  type DriverConnectionFlags,
  type ResolveConnectionFlagsOptions,
} from "./resolveConnectionFlags";

export type CliConnectionTargetOptions = Partial<DriverConnectionFlags> & {
  test?: boolean;
};

export function resolveCliConnectionNames(
  options: CliConnectionTargetOptions | undefined,
  resolveOptions: ResolveConnectionFlagsOptions = {}
): ConnectionName[] {
  const normalized = options ?? {};
  return resolveConnectionNamesFromFlags(
    normalized.test === true,
    {
      mysql: normalized.mysql === true,
      pg: normalized.pg === true,
      sqlite: normalized.sqlite === true,
      mongo: normalized.mongo === true,
      allConnections: normalized.allConnections === true,
    },
    resolveOptions
  );
}

export function resolveCliPrimaryConnectionName(
  options: CliConnectionTargetOptions | undefined,
  resolveOptions: ResolveConnectionFlagsOptions = {}
): ConnectionName | undefined {
  return resolveCliConnectionNames(options, resolveOptions)[0];
}
