import {
  describeArtifactCompatibilityMismatch,
  resolveArtifactCompatibility,
  type ArtifactCompatibilityReason,
  type StorageKind,
  type TargetStorageKind,
} from "./ArtifactCompatibility";

export type TargetedArtifactDecision = {
  name: string;
  kind: StorageKind;
  matches: boolean;
  reason: ArtifactCompatibilityReason;
};

export function createTargetedArtifactDecision(
  name: string,
  kind: StorageKind,
  targetKind: TargetStorageKind,
): TargetedArtifactDecision {
  const compatibility = resolveArtifactCompatibility(kind, targetKind);
  return {
    name,
    kind,
    matches: compatibility.matches,
    reason: compatibility.reason,
  };
}

export function summarizeSkippedArtifacts(
  label: string,
  decisions: TargetedArtifactDecision[],
  targetKind: TargetStorageKind,
): string | null {
  if (decisions.length === 0) {
    return null;
  }

  const pluralLabel = decisions.length === 1 ? label : `${label}s`;
  const details = decisions
    .map(
      (decision) =>
        `${decision.name} (${describeArtifactCompatibilityMismatch(decision.kind, targetKind)})`,
    )
    .join("; ");

  return `Skipping incompatible ${pluralLabel} for ${targetKind}: ${details}`;
}
