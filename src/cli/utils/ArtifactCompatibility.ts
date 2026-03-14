export type StorageKind = "mongo" | "sql" | "mixed" | "unknown";
export type TargetStorageKind = Exclude<StorageKind, "unknown" | "mixed">;

export type ArtifactCompatibilityReason =
  | "direct_match"
  | "unknown_artifact_kind"
  | "mixed_artifact"
  | "different_storage_kind";

export function collapseStorageKinds(kinds: Iterable<StorageKind>): StorageKind {
  const uniqueKinds = Array.from(new Set(kinds));

  if (uniqueKinds.length === 0) {
    return "unknown";
  }

  if (uniqueKinds.includes("mixed")) {
    return "mixed";
  }

  if (uniqueKinds.includes("mongo") && uniqueKinds.includes("sql")) {
    return "mixed";
  }

  if (uniqueKinds.length === 1) {
    return uniqueKinds[0];
  }

  return "unknown";
}

export function resolveArtifactCompatibility(
  artifactKind: StorageKind,
  targetKind: TargetStorageKind,
): {
  matches: boolean;
  reason: ArtifactCompatibilityReason;
} {
  if (artifactKind === targetKind) {
    return {
      matches: true,
      reason: "direct_match",
    };
  }

  if (artifactKind === "unknown") {
    return {
      matches: true,
      reason: "unknown_artifact_kind",
    };
  }

  if (artifactKind === "mixed") {
    return {
      matches: false,
      reason: "mixed_artifact",
    };
  }

  return {
    matches: false,
    reason: "different_storage_kind",
  };
}

export function describeArtifactCompatibilityMismatch(
  artifactKind: StorageKind,
  targetKind: TargetStorageKind,
): string {
  const compatibility = resolveArtifactCompatibility(artifactKind, targetKind);

  switch (compatibility.reason) {
    case "mixed_artifact":
      return `mixed sql/mongo artifacts cannot run in ${targetKind}-targeted flows`;
    case "different_storage_kind":
      return `${artifactKind} artifacts cannot run in ${targetKind}-targeted flows`;
    case "unknown_artifact_kind":
      return `unknown artifact kind is allowed for ${targetKind}-targeted flows`;
    case "direct_match":
    default:
      return `${artifactKind} artifacts are compatible with ${targetKind}-targeted flows`;
  }
}
