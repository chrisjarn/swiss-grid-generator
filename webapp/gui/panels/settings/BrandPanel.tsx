import { memo } from "react"
import { Label } from "@/shared/ui/label"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { BRAND_THEMES, getBrandTheme, type BrandId } from "@/core/config/brands"
import { getImageColorScheme, type ImageColorSchemeId } from "@/core/config/color-schemes"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"
import { useTranslation } from "@/lib/i18n"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  /** Active colour scheme — used to infer which brand (if any) is selected. */
  colorScheme: ImageColorSchemeId
  onBrandChange: (brandId: BrandId) => void
  isDarkMode: boolean
}

export const BrandPanel = memo(function BrandPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  colorScheme,
  onBrandChange,
  isDarkMode,
}: Props) {
  const { t } = useTranslation()
  const activeBrand = BRAND_THEMES.find((brand) => brand.colorSchemeId === colorScheme) ?? null
  const listClassName = getSettingsOpenListClassName(isDarkMode)

  return (
    <PanelCard
      title={t("ui.panels.brand.title")}
      tooltip={t("ui.panels.brand.tooltip")}
      collapsed={collapsed}
      collapsedSummary={(
        <span className="text-[11px] text-muted-foreground">
          {activeBrand ? activeBrand.label : t("ui.panels.brand.custom")}
        </span>
      )}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="brand"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>{t("ui.panels.brand.theme")}</Label>
        <div role="listbox" aria-label={t("ui.panels.brand.themeAria")} className={listClassName}>
          {BRAND_THEMES.map((brand) => {
            const scheme = getImageColorScheme(brand.colorSchemeId)
            const isActive = activeBrand?.id === brand.id
            return (
              <button
                key={brand.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={getSettingsOpenListOptionClassName(isDarkMode, isActive)}
                onClick={() => onBrandChange(brand.id)}
              >
                <span className="min-w-0 truncate">{brand.label}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1 pl-3">
                  {scheme.colors.map((color, index) => (
                    <span
                      key={`${brand.id}-${index}-${color}`}
                      className="h-3 w-5 rounded-sm border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <p className="px-1 pt-1 text-[10px] leading-snug text-muted-foreground">
          {activeBrand
            ? `${t("ui.panels.brand.fontLabel", { font: getBrandTheme(activeBrand.id).defaultFont })}${activeBrand.logoSrc ? t("ui.panels.brand.logoReady") : ""}`
            : t("ui.panels.brand.pickPrompt")}
        </p>
      </div>
    </PanelCard>
  )
})

BrandPanel.displayName = "BrandPanel"
