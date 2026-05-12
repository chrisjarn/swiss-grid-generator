import type { MouseEventHandler, ReactNode } from "react"
import {
  Download,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  Layers3,
  Redo2,
  Rows3,
  Save,
  SquareDashed,
  Type,
  Undo2,
  Upload,
  UserRound,
  ZoomIn,
} from "lucide-react"
import { translateMessage } from "@/lib/i18n"
import type { PreviewHeaderShortcutId } from "@/gui/shell/lib/preview-header-shortcuts"
import type { WorkspacePanel } from "@/core/types/workspace"

export type SidebarPanel = WorkspacePanel

export type HeaderAction = {
  key: string
  ariaLabel: string
  tooltip: string
  shortcutId?: PreviewHeaderShortcutId
  icon: ReactNode
  showStatusDot?: boolean
  statusDotClassName?: string
  buttonClassName?: string
  variant?: "default" | "outline"
  pressed?: boolean
  disabled?: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
}

export type HeaderItem = { type: "action"; action: HeaderAction } | { type: "divider"; key: string }

type Args = {
  activeSidebarPanel: SidebarPanel
  showPresetsBrowser: boolean
  hasPreviewLayout: boolean
  showBaselines: boolean
  showMargins: boolean
  showModules: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  showLayers: boolean
  smartTextZoomEnabled: boolean
  saveStatusDotClassName: string
  saveStatusLabel: string
  accountStatusDotClassName: string
  accountUserEmail: string | null
  accountCloudStatusLabel: string
  canUndo: boolean
  canRedo: boolean
  onOpenPresets: () => void
  onImportProject: () => void
  onOpenSaveLibraryDialog: () => void
  onOpenExportDialog: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleSmartTextZoom: MouseEventHandler<HTMLButtonElement>
  onToggleBaselines: MouseEventHandler<HTMLButtonElement>
  onToggleMargins: MouseEventHandler<HTMLButtonElement>
  onToggleModules: MouseEventHandler<HTMLButtonElement>
  onToggleImagePlaceholders: MouseEventHandler<HTMLButtonElement>
  onToggleTypography: MouseEventHandler<HTMLButtonElement>
  onToggleLayersPanel: MouseEventHandler<HTMLButtonElement>
  onToggleAccountPanel: MouseEventHandler<HTMLButtonElement>
}

export function useHeaderActions(args: Args) {
  const canSaveOrExport = args.hasPreviewLayout && !args.showPresetsBrowser
  const canUseLayerControls = args.hasPreviewLayout && !args.showPresetsBrowser
  const t = translateMessage
  const accountTooltip = args.accountUserEmail
    ? t("ui.shell.topBar.actions.account.tooltipSignedIn", { email: args.accountUserEmail, status: args.accountCloudStatusLabel })
    : t("ui.shell.topBar.actions.account.tooltipSignedOut", { status: args.accountCloudStatusLabel })

  const fileGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "presets",
        ariaLabel: t("ui.shell.topBar.actions.presets.aria"),
        tooltip: t("ui.shell.topBar.actions.presets.tooltip"),
        shortcutId: "toggle_example_panel",
        variant: args.showPresetsBrowser ? "default" : "outline",
        pressed: args.showPresetsBrowser,
        onClick: args.onOpenPresets,
        icon: <LayoutTemplate className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "import",
        ariaLabel: t("ui.shell.topBar.actions.import.aria"),
        tooltip: t("ui.shell.topBar.actions.import.tooltip"),
        shortcutId: "import_project",
        onClick: args.onImportProject,
        icon: <Download className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "save",
        ariaLabel: t("ui.shell.topBar.actions.save.aria"),
        tooltip: `${t("ui.shell.topBar.actions.save.tooltip")}\n${t("ui.shell.topBar.actions.save.status", { status: args.saveStatusLabel })}`,
        shortcutId: "save_to_library",
        showStatusDot: args.hasPreviewLayout,
        statusDotClassName: args.saveStatusDotClassName,
        disabled: !canSaveOrExport,
        onClick: args.onOpenSaveLibraryDialog,
        icon: <Save className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "export",
        ariaLabel: t("ui.shell.topBar.actions.export.aria"),
        tooltip: t("ui.shell.topBar.actions.export.tooltip"),
        shortcutId: "open_export",
        disabled: !canSaveOrExport,
        onClick: args.onOpenExportDialog,
        icon: <Upload className="h-4 w-4" />,
      },
    },
  ]

  const smartTextZoomItem: HeaderItem = {
    type: "action",
    action: {
      key: "smart-text-zoom",
      ariaLabel: args.smartTextZoomEnabled ? t("ui.shell.topBar.actions.smartTextZoom.disable") : t("ui.shell.topBar.actions.smartTextZoom.enable"),
      tooltip: t("ui.shell.topBar.actions.smartTextZoom.tooltip"),
      variant: args.smartTextZoomEnabled ? "default" : "outline",
      pressed: args.smartTextZoomEnabled,
      disabled: !args.hasPreviewLayout,
      onClick: args.onToggleSmartTextZoom,
      icon: <ZoomIn className="h-4 w-4" />,
    },
  }

  const displayGroup: HeaderItem[] = args.showPresetsBrowser ? [smartTextZoomItem] : [
    smartTextZoomItem,
    { type: "divider", key: "divider-smart-text-zoom-history" },
    {
      type: "action",
      action: {
        key: "undo",
        ariaLabel: t("ui.shell.topBar.actions.undo.aria"),
        tooltip: t("ui.shell.topBar.actions.undo.tooltip"),
        shortcutId: "undo",
        disabled: !args.canUndo,
        onClick: args.onUndo,
        icon: <Undo2 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "redo",
        ariaLabel: t("ui.shell.topBar.actions.redo.aria"),
        tooltip: t("ui.shell.topBar.actions.redo.tooltip"),
        shortcutId: "redo",
        disabled: !args.canRedo,
        onClick: args.onRedo,
        icon: <Redo2 className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-history-baselines" },
    {
      type: "action",
      action: {
        key: "baselines",
        ariaLabel: t("ui.shell.topBar.actions.baselines.aria"),
        tooltip: t("ui.shell.topBar.actions.baselines.tooltip"),
        shortcutId: "toggle_baselines",
        variant: args.showBaselines ? "default" : "outline",
        pressed: args.showBaselines,
        disabled: !canUseLayerControls,
        onClick: args.onToggleBaselines,
        icon: <Rows3 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "margins",
        ariaLabel: t("ui.shell.topBar.actions.margins.aria"),
        tooltip: t("ui.shell.topBar.actions.margins.tooltip"),
        shortcutId: "toggle_margins",
        variant: args.showMargins ? "default" : "outline",
        pressed: args.showMargins,
        disabled: !canUseLayerControls,
        onClick: args.onToggleMargins,
        icon: <SquareDashed className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "modules",
        ariaLabel: t("ui.shell.topBar.actions.modules.aria"),
        tooltip: t("ui.shell.topBar.actions.modules.tooltip"),
        shortcutId: "toggle_modules",
        variant: args.showModules ? "default" : "outline",
        pressed: args.showModules,
        disabled: !canUseLayerControls,
        onClick: args.onToggleModules,
        icon: <LayoutGrid className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "typography",
        ariaLabel: t("ui.shell.topBar.actions.typography.aria"),
        tooltip: t("ui.shell.topBar.actions.typography.tooltip"),
        shortcutId: "toggle_typography",
        variant: args.showTypography ? "default" : "outline",
        pressed: args.showTypography,
        disabled: !canUseLayerControls,
        onClick: args.onToggleTypography,
        icon: <Type className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "image-placeholders",
        ariaLabel: t("ui.shell.topBar.actions.imagePlaceholders.aria"),
        tooltip: t("ui.shell.topBar.actions.imagePlaceholders.tooltip"),
        shortcutId: "toggle_image_placeholders",
        variant: args.showImagePlaceholders ? "default" : "outline",
        pressed: args.showImagePlaceholders,
        disabled: !canUseLayerControls,
        onClick: args.onToggleImagePlaceholders,
        icon: <ImageIcon className="h-4 w-4" aria-hidden="true" />,
      },
    },
    { type: "divider", key: "divider-typography-layers" },
    {
      type: "action",
      action: {
        key: "layers",
        ariaLabel: args.showLayers ? t("ui.shell.topBar.actions.layers.hide") : t("ui.shell.topBar.actions.layers.show"),
        tooltip: t("ui.shell.topBar.actions.layers.tooltip"),
        shortcutId: "toggle_layers_panel",
        variant: args.showLayers ? "default" : "outline",
        pressed: args.showLayers,
        disabled: args.showPresetsBrowser,
        onClick: args.onToggleLayersPanel,
        icon: <Layers3 className="h-4 w-4" />,
      },
    },
  ]

  const sidebarGroup: HeaderAction[] = [
    {
      key: "account",
      ariaLabel: args.activeSidebarPanel === "account" ? t("ui.shell.topBar.actions.account.hide") : t("ui.shell.topBar.actions.account.show"),
      tooltip: accountTooltip,
      showStatusDot: true,
      statusDotClassName: args.accountStatusDotClassName,
      variant: "outline",
      pressed: args.activeSidebarPanel === "account",
      onClick: args.onToggleAccountPanel,
      icon: <UserRound className="h-4 w-4" />,
    },
  ]

  return {
    fileGroup,
    displayGroup,
    sidebarGroup,
  }
}
