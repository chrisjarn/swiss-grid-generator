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
import type { PreviewHeaderShortcutId } from "@/lib/preview-header-shortcuts"

export type SidebarPanel = "help" | "legal" | "layers" | "feedback" | "account" | null

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
    ? t("topBar.actions.account.tooltipSignedIn", { email: args.accountUserEmail, status: args.accountCloudStatusLabel })
    : t("topBar.actions.account.tooltipSignedOut", { status: args.accountCloudStatusLabel })

  const fileGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "presets",
        ariaLabel: t("topBar.actions.presets.aria"),
        tooltip: t("topBar.actions.presets.tooltip"),
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
        key: "save",
        ariaLabel: t("topBar.actions.save.aria"),
        tooltip: `${t("topBar.actions.save.tooltip")}\n${t("topBar.actions.save.status", { status: args.saveStatusLabel })}`,
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
        key: "import",
        ariaLabel: t("topBar.actions.import.aria"),
        tooltip: t("topBar.actions.import.tooltip"),
        shortcutId: "import_project",
        onClick: args.onImportProject,
        icon: <Download className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "export",
        ariaLabel: t("topBar.actions.export.aria"),
        tooltip: t("topBar.actions.export.tooltip"),
        shortcutId: "open_export",
        disabled: !canSaveOrExport,
        onClick: args.onOpenExportDialog,
        icon: <Upload className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-export-undo" },
    {
      type: "action",
      action: {
        key: "undo",
        ariaLabel: t("topBar.actions.undo.aria"),
        tooltip: t("topBar.actions.undo.tooltip"),
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
        ariaLabel: t("topBar.actions.redo.aria"),
        tooltip: t("topBar.actions.redo.tooltip"),
        shortcutId: "redo",
        disabled: !args.canRedo,
        onClick: args.onRedo,
        icon: <Redo2 className="h-4 w-4" />,
      },
    },
  ]

  const displayGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "smart-text-zoom",
        ariaLabel: args.smartTextZoomEnabled ? t("topBar.actions.smartTextZoom.disable") : t("topBar.actions.smartTextZoom.enable"),
        tooltip: t("topBar.actions.smartTextZoom.tooltip"),
        variant: args.smartTextZoomEnabled ? "default" : "outline",
        pressed: args.smartTextZoomEnabled,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleSmartTextZoom,
        icon: <ZoomIn className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-smart-text-zoom-baselines" },
    {
      type: "action",
      action: {
        key: "baselines",
        ariaLabel: t("topBar.actions.baselines.aria"),
        tooltip: t("topBar.actions.baselines.tooltip"),
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
        ariaLabel: t("topBar.actions.margins.aria"),
        tooltip: t("topBar.actions.margins.tooltip"),
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
        ariaLabel: t("topBar.actions.modules.aria"),
        tooltip: t("topBar.actions.modules.tooltip"),
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
        ariaLabel: t("topBar.actions.typography.aria"),
        tooltip: t("topBar.actions.typography.tooltip"),
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
        ariaLabel: t("topBar.actions.imagePlaceholders.aria"),
        tooltip: t("topBar.actions.imagePlaceholders.tooltip"),
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
        ariaLabel: args.showLayers ? t("topBar.actions.layers.hide") : t("topBar.actions.layers.show"),
        tooltip: t("topBar.actions.layers.tooltip"),
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
      ariaLabel: args.activeSidebarPanel === "account" ? t("topBar.actions.account.hide") : t("topBar.actions.account.show"),
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
