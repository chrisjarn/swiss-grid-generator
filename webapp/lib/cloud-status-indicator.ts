import { translateMessage } from "@/lib/i18n"

export type CloudSyncIndicatorStatus = "signed_out" | "idle" | "syncing" | "synced" | "offline" | "error" | "conflict"
export type PresetSyncIndicatorStatus = "local" | "idle" | "syncing" | "synced" | "offline" | "conflict" | "error" | "deleted"
export type SaveStatusIndicatorStatus = "unsaved" | "local" | "synced"

export const CLOUD_STATUS_GREEN_CLASSNAME = "bg-[#4CAF50]"
export const CLOUD_STATUS_ORANGE_CLASSNAME = "bg-[#fbae17]"
export const CLOUD_STATUS_RED_CLASSNAME = "bg-swiss-orange-soft"

export function getCloudSyncStatusIndicatorClassName({
  status,
  isSignedIn,
}: {
  status: CloudSyncIndicatorStatus
  isSignedIn: boolean
}): string {
  if (!isSignedIn) return CLOUD_STATUS_ORANGE_CLASSNAME
  if (status === "error" || status === "conflict") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getPresetSyncStatusIndicatorClassName({
  status,
  isSignedIn,
}: {
  status: PresetSyncIndicatorStatus | undefined
  isSignedIn: boolean
}): string {
  if (!isSignedIn) return CLOUD_STATUS_ORANGE_CLASSNAME
  if (status === "error" || status === "conflict") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getSaveStatusIndicatorClassName(status: SaveStatusIndicatorStatus): string {
  if (status === "unsaved") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getSaveStatusIndicatorLabel(status: SaveStatusIndicatorStatus): string {
  if (status === "unsaved") return translateMessage("status.save.notSavedLocally")
  if (status === "synced") return translateMessage("status.save.syncedToCloud")
  return translateMessage("status.save.savedToLocalStore")
}
