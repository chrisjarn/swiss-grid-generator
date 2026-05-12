"use client"

import { ChevronUp, MoreVertical } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  LAYOUT_PRESET_GROUPS,
  type LayoutPreset,
  type LayoutPresetGroup,
} from "@/lib/presets"
import { HoverTooltip } from "@/shared/ui/hover-tooltip"
import { PresetPageThumbnail } from "@/gui/panels/sidebar/PresetPageThumbnail"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import { getPresetSyncStatusIndicatorClassName } from "@/gui/shell/lib/cloud-status-indicator"
import {
  deleteUserProjectFromLibrary,
  saveProjectToUserLibrary,
  userLayoutPresetQuery,
} from "@/lib/user-layout-library"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { translateMessage } from "@/core/i18n/messages"

type PresetGroupCategory = (typeof LAYOUT_PRESET_GROUPS)[number]["category"]
const PRESET_GROUP_COLLAPSED_STORAGE_KEY = "swiss-grid-generator.preset-browser.collapsed-groups"

type Props = {
  onLoadPreset: (preset: LayoutPreset) => void
  onExportPreset?: (preset: LayoutPreset) => void
  onDeleteUserPreset?: (preset: LayoutPreset) => Promise<void>
  isCloudSignedIn?: boolean
  isDarkMode?: boolean
  compact?: boolean
  showRolloverInfo?: boolean
  onRequestNotice?: (notice: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm?: () => void
    onCancel?: () => void
  }) => void
}

function formatPresetCreatedAt(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function formatPresetNumber(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatPresetGroupHeaderLabel(label: string): string {
  return label
}

function getPresetThumbnailDimensions(preset: LayoutPreset, compact: boolean): { width: number; height: number } {
  const pageSize = preset.browserPage.result.pageSizePt
  const safeHeight = Math.max(pageSize.height, 0.0001)
  const aspectRatio = pageSize.width / safeHeight
  const height = compact ? 164 : 224
  const width = Math.max(120, Math.round(height * aspectRatio))
  return { width, height }
}

function getPresetCloudStatusLabel(
  syncState: LayoutPreset["syncState"],
  isCloudSignedIn: boolean,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (!isCloudSignedIn) return t("ui.panels.presets.notConnected")
  if (syncState === "synced") return t("ui.panels.presets.cloudSynced")
  if (syncState === "syncing") return t("ui.panels.presets.cloudSyncing")
  if (syncState === "conflict") return t("ui.panels.presets.cloudConflict")
  if (syncState === "error") return t("ui.panels.presets.cloudError")
  if (syncState === "deleted") return t("ui.panels.presets.cloudDeleteQueued")
  return t("ui.panels.presets.cloudPending")
}

function PresetGroupHeaderLabel({
  group,
  isDarkMode,
}: {
  group: LayoutPresetGroup
  isDarkMode: boolean
}) {
  const label = formatPresetGroupHeaderLabel(group.label)
  if (group.category !== "users") return label

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span>{label}</span>
      <HoverTooltip
        inline
        constrainToClosestSelector='[data-tooltip-boundary="preset-browser"]'
        constrainAxes="horizontal"
        horizontalAlign="start"
        viewportPaddingPx={24}
        tooltipClassName={`w-72 max-w-[80vw] whitespace-normal border px-2 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal ${
          isDarkMode
            ? "border-gray-600 bg-gray-900/95 text-gray-200"
            : "border-gray-300 bg-white/95 text-gray-700"
        }`}
        label={(
          <div className="space-y-1">
            <div>
              {translateMessage("ui.panels.presets.storageLocal")}
            </div>
            <div>
              {translateMessage("ui.panels.presets.storageRisk")}
            </div>
            <div>
              {translateMessage("ui.panels.presets.storageCloud")}
            </div>
          </div>
        )}
      >
        <span
          aria-label={translateMessage("ui.panels.presets.storageInfo")}
          className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-swiss-orange-soft/70 text-[9px] font-semibold normal-case leading-none tracking-normal text-swiss-orange-soft"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          i
        </span>
      </HoverTooltip>
    </span>
  )
}

function PresetTooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr] gap-2">
      <span className="font-semibold">{label}</span>
      <span className="min-w-0">{value}</span>
    </div>
  )
}

function readCollapsedPresetGroups(): Partial<Record<PresetGroupCategory, boolean>> {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRESET_GROUP_COLLAPSED_STORAGE_KEY) ?? "{}")
    if (!parsed || typeof parsed !== "object") return {}
    return LAYOUT_PRESET_GROUPS.reduce<Partial<Record<PresetGroupCategory, boolean>>>((next, group) => {
      if ((parsed as Record<string, unknown>)[group.category] === true) {
        next[group.category] = true
      }
      return next
    }, {})
  } catch {
    return {}
  }
}

function PresetCard({
  preset,
  onLoadPreset,
  onExportPreset,
  isDarkMode,
  showRolloverInfo,
  menuOpen,
  onMenuOpenChange,
  onCopyUserPreset,
  onDeleteUserPreset,
  isCloudSignedIn,
  compact,
  t,
}: {
  preset: LayoutPreset
  onLoadPreset: (preset: LayoutPreset) => void
  onExportPreset?: (preset: LayoutPreset) => void
  isDarkMode: boolean
  showRolloverInfo: boolean
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onCopyUserPreset: (preset: LayoutPreset) => void
  onDeleteUserPreset: (preset: LayoutPreset) => void
  isCloudSignedIn: boolean
  compact: boolean
  t: ReturnType<typeof useTranslation>["t"]
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isUserPreset = preset.source === "user"
  const syncIndicatorClassName = isUserPreset
    ? getPresetSyncStatusIndicatorClassName({ status: preset.syncState, isSignedIn: isCloudSignedIn })
    : null
  const result = preset.browserPage.result
  const baselineGrid = result.typography.metadata.baselineGrid
  const cloudStatusLabel = getPresetCloudStatusLabel(preset.syncState, isCloudSignedIn, t)
  const thumbnailDimensions = getPresetThumbnailDimensions(preset, compact)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      onMenuOpenChange(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMenuOpenChange(false)
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen, onMenuOpenChange])

  return (
    <HoverTooltip
      className="block"
      disabled={!showRolloverInfo || menuOpen}
      constrainToClosestSelector='[data-tooltip-boundary="preset-browser"]'
      constrainAxes="horizontal"
      viewportPaddingPx={36}
      tooltipClassName={`w-80 max-w-[80vw] whitespace-normal border px-2 py-2 text-[11px] leading-snug ${
        isDarkMode
          ? "border-gray-600 bg-gray-900/95 text-gray-200"
          : "border-gray-300 bg-white/95 text-gray-700"
      }`}
      label={(
        <div className="space-y-1">
          <PresetTooltipRow label={t("ui.panels.presets.titleLabel")} value={preset.title ?? preset.label} />
          <PresetTooltipRow label={t("ui.panels.presets.subjectLabel")} value={preset.description || "—"} />
          <PresetTooltipRow label={t("ui.panels.presets.authorLabel")} value={preset.author || "—"} />
          <PresetTooltipRow label={t("ui.panels.presets.createdLabel")} value={formatPresetCreatedAt(preset.createdAt)} />
          <PresetTooltipRow label={t("ui.panels.presets.formatLabel")} value={`${result.format} / ${result.settings.orientation}`} />
          <PresetTooltipRow label={t("ui.panels.presets.gridLabel")} value={`${result.settings.gridCols} x ${result.settings.gridRows}`} />
          <PresetTooltipRow label={t("ui.panels.presets.baselineLabel")} value={`${formatPresetNumber(baselineGrid)} pt`} />
          <PresetTooltipRow label={t("ui.panels.presets.marginsLabel")} value={result.settings.marginMethod} />
          <PresetTooltipRow label={t("ui.panels.presets.rhythmLabel")} value={result.settings.rhythm} />
          {isUserPreset ? (
            <div className={`mt-1 border-t pt-1 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="grid grid-cols-[82px_1fr] gap-2">
                <span className="font-semibold">{t("ui.panels.presets.cloudLabel")}</span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {syncIndicatorClassName ? (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white dark:ring-[#1D232D] ${syncIndicatorClassName}`}
                    />
                  ) : null}
                  <span className="min-w-0">{cloudStatusLabel}</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    >
      <div
        className="relative max-w-full shrink-0"
        style={{
          width: `${thumbnailDimensions.width}px`,
          height: `${thumbnailDimensions.height}px`,
        }}
      >
        <button
          type="button"
          data-preset-id={preset.id}
          className={`relative h-full w-full rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
          onClick={() => onLoadPreset(preset)}
        >
          {syncIndicatorClassName ? (
            <span
              aria-hidden="true"
              className={`absolute right-1 top-1 z-10 h-1.5 w-1.5 rounded-full ring-1 ring-white dark:ring-[#1D232D] ${syncIndicatorClassName}`}
            />
          ) : null}
          <div className={`absolute inset-2 border ${isDarkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-white"}`}>
            <PresetPageThumbnail page={preset.browserPage} />
          </div>
        </button>
        <div className={`absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1 text-[10px] ${isDarkMode ? "bg-gray-900/90 text-gray-300" : "bg-white/90 text-gray-600"}`}>
          <span className="min-w-0 flex-1 truncate text-center">{preset.label}</span>
          {isUserPreset ? (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label={t("ui.panels.presets.actions.more", { title: preset.label })}
                className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${isDarkMode ? "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onMenuOpenChange(!menuOpen)
                }}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              {menuOpen ? (
                <div
                  className={`absolute bottom-full right-0 z-20 mb-1 min-w-[112px] rounded-md border py-1 shadow-lg ${isDarkMode ? "border-gray-600 bg-gray-900 text-gray-200" : "border-gray-300 bg-white text-gray-700"}`}
                >
                  <button
                    type="button"
                    className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onMenuOpenChange(false)
                      onLoadPreset(preset)
                    }}
                  >
                    {t("ui.panels.presets.actions.open")}
                  </button>
                  {onExportPreset ? (
                    <button
                      type="button"
                      className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onMenuOpenChange(false)
                        onExportPreset(preset)
                      }}
                    >
                      {t("ui.panels.presets.actions.export")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onMenuOpenChange(false)
                      onCopyUserPreset(preset)
                    }}
                  >
                    {t("ui.panels.presets.actions.copy")}
                  </button>
                  <button
                    type="button"
                    className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "text-red-300 hover:bg-red-950/50" : "text-red-600 hover:bg-red-50"}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onMenuOpenChange(false)
                      onDeleteUserPreset(preset)
                    }}
                  >
                    {t("ui.panels.presets.actions.delete")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </HoverTooltip>
  )
}

export function PresetLayoutsPanel({
  onLoadPreset,
  onExportPreset,
  onDeleteUserPreset,
  isCloudSignedIn = false,
  isDarkMode = false,
  compact = false,
  showRolloverInfo = true,
  onRequestNotice,
}: Props) {
  const { t } = useTranslation()
  const [userPresets, setUserPresets] = useState<LayoutPreset[]>([])
  const [openMenuPresetId, setOpenMenuPresetId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Partial<Record<PresetGroupCategory, boolean>>>({})
  const [hasLoadedCollapsedGroups, setHasLoadedCollapsedGroups] = useState(false)

  useEffect(() => {
    const subscription = userLayoutPresetQuery.subscribe({
      next: (presets) => {
        setUserPresets(Array.isArray(presets) ? presets : [])
      },
      error: (error) => {
        console.error(error)
        setUserPresets([])
      },
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setCollapsedGroups(readCollapsedPresetGroups())
    setHasLoadedCollapsedGroups(true)
  }, [])

  useEffect(() => {
    if (!openMenuPresetId) return
    if (userPresets.some((preset) => preset.id === openMenuPresetId)) return
    setOpenMenuPresetId(null)
  }, [openMenuPresetId, userPresets])

  useEffect(() => {
    if (!hasLoadedCollapsedGroups) return
    window.localStorage.setItem(PRESET_GROUP_COLLAPSED_STORAGE_KEY, JSON.stringify(collapsedGroups))
  }, [collapsedGroups, hasLoadedCollapsedGroups])

  const visibleGroups = useMemo(() => (
    [...LAYOUT_PRESET_GROUPS]
      .map((group) => (
        group.category === "users"
          ? { ...group, presets: userPresets }
          : group
      ))
      .filter((group) => group.presets.length > 0)
  ), [userPresets])

  const handleCopyUserPreset = useCallback(async (preset: LayoutPreset) => {
    try {
      const sourceProject = JSON.parse(preset.projectSourceJson) as Record<string, unknown>
      const nextTitle = (preset.title ?? preset.label).trim() || t("ui.panels.presets.untitled")
      const duplicatedTitle = `${nextTitle} ${t("ui.panels.presets.copySuffix")}`
      const duplicatedDescription = preset.description ?? ""
      const duplicatedAuthor = preset.author ?? ""
      const createdAt = preset.createdAt && !Number.isNaN(Date.parse(preset.createdAt))
        ? new Date(preset.createdAt).toISOString()
        : new Date().toISOString()
      const duplicatedProject = {
        ...sourceProject,
        title: duplicatedTitle,
        description: duplicatedDescription,
        author: duplicatedAuthor,
        createdAt,
      }

      await saveProjectToUserLibrary({
        label: duplicatedTitle,
        title: duplicatedTitle,
        description: duplicatedDescription,
        author: duplicatedAuthor,
        createdAt,
        originPresetId: preset.originPresetId ?? null,
        project: duplicatedProject,
      })

      onRequestNotice?.({
        title: t("ui.panels.presets.copiedTitle"),
        message: t("ui.panels.presets.copiedMessage"),
      })
    } catch (error) {
      console.error(error)
      onRequestNotice?.({
        title: t("ui.panels.presets.copyFailedTitle"),
        message: t("ui.panels.presets.copyFailedMessage"),
      })
    }
  }, [onRequestNotice, t])

  const handleDeleteUserPreset = useCallback(async (preset: LayoutPreset) => {
    const targetId = preset.userProjectId ?? preset.id
    if (!targetId) return

    const presetLabel = (preset.title ?? preset.label).trim() || t("ui.panels.presets.untitled")
    const cloudText = isCloudSignedIn
      ? t("ui.panels.presets.deleteSyncedCloudText")
      : t("ui.panels.presets.deleteQueuedCloudText")
    onRequestNotice?.({
      title: t("ui.panels.presets.deleteTitle"),
      message: t("ui.panels.presets.deleteMessage", { title: presetLabel, cloudText }),
      confirmLabel: t("ui.common.delete"),
      cancelLabel: t("ui.common.cancel"),
      onConfirm: () => {
        void (async () => {
          try {
            if (onDeleteUserPreset) {
              await onDeleteUserPreset(preset)
              return
            }

            await deleteUserProjectFromLibrary(targetId)
            onRequestNotice?.({
              title: t("ui.panels.presets.deletedTitle"),
              message: isCloudSignedIn
                ? t("ui.panels.presets.deleteNoHandlerMessage")
                : t("ui.panels.presets.deleteSignedOutMessage"),
            })
          } catch (error) {
            console.error(error)
            onRequestNotice?.({
              title: t("ui.panels.presets.deleteFailedTitle"),
              message: t("ui.panels.presets.deleteFailedMessage"),
            })
          }
        })()
      },
    })
  }, [isCloudSignedIn, onDeleteUserPreset, onRequestNotice, t])

  const cardGapClass = compact ? "gap-2" : "gap-3"
  const groupToggleClassName = isDarkMode
    ? "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
    : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
  return (
    <div
      data-tooltip-boundary="preset-browser"
      className="pb-12"
    >
      {!compact ? (
        <>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            <span>{t("ui.panels.presets.title")}</span>
          </h3>
          <p className={`text-xs mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            {t("ui.panels.presets.description")}
          </p>
        </>
      ) : null}
      <div className="space-y-6">
        {visibleGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.category] === true

          return (
            <section key={group.category} className="space-y-3">
              <div className="rounded-md py-2">
                <SectionHeaderRow
                  label={<PresetGroupHeaderLabel group={group} isDarkMode={isDarkMode} />}
                  aria-expanded={!isCollapsed}
                  actionIcon={(
                    <ChevronUp
                      className={`h-2 w-2 transition-transform ${isCollapsed ? "rotate-90" : "rotate-180"}`}
                      aria-hidden="true"
                    />
                  )}
                  actionClassName={groupToggleClassName}
                  onRowClick={() => {
                    setCollapsedGroups((current) => ({
                      ...current,
                      [group.category]: !current[group.category],
                    }))
                  }}
                  onRowDoubleClick={(event) => {
                    event.preventDefault()
                    setCollapsedGroups((current) => {
                      const shouldCollapseAll = visibleGroups.some((visibleGroup) => current[visibleGroup.category] !== true)
                      const next = { ...current }
                      visibleGroups.forEach((visibleGroup) => {
                        next[visibleGroup.category] = shouldCollapseAll
                      })
                      return next
                    })
                  }}
                />
              </div>

              {!isCollapsed && group.presets.length > 0 ? (
                <div
                  className={`flex flex-wrap items-end ${cardGapClass}`}
                >
                  {group.presets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onLoadPreset={onLoadPreset}
                      onExportPreset={onExportPreset}
                      isDarkMode={isDarkMode}
                      showRolloverInfo={showRolloverInfo}
                      menuOpen={openMenuPresetId === preset.id}
                      onMenuOpenChange={(open) => {
                        setOpenMenuPresetId(open ? preset.id : null)
                      }}
                      onCopyUserPreset={handleCopyUserPreset}
                      onDeleteUserPreset={handleDeleteUserPreset}
                      isCloudSignedIn={isCloudSignedIn}
                      compact={compact}
                      t={t}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
