import { Button } from "@/shared/ui/button"
import type { ButtonProps } from "@/shared/ui/button"
import { DocumentationHoverInfo, type DocumentationHoverInfoId } from "@/shared/ui/documentation-hover-info"
import { getCompactActionButtonClassName } from "@/shared/ui/popup-styles"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type HeaderIconButtonProps = {
  ariaLabel: string
  tooltip: string
  helpId?: DocumentationHoverInfoId
  children: ReactNode
  buttonClassName?: string
  showTooltip?: boolean
  showStatusDot?: boolean
  statusDotClassName?: string
  isDarkMode?: boolean
} & Pick<ButtonProps, "variant" | "disabled" | "onClick"> & {
    "aria-pressed"?: boolean
  }

export function HeaderIconButton({
  ariaLabel,
  tooltip,
  helpId,
  children,
  variant = "outline",
  disabled,
  onClick,
  buttonClassName,
  showTooltip = true,
  showStatusDot = false,
  statusDotClassName,
  isDarkMode = false,
  "aria-pressed": ariaPressed,
}: HeaderIconButtonProps) {
  const isActive = ariaPressed === true || variant === "default"

  return (
    <DocumentationHoverInfo
      label={tooltip}
      helpId={helpId}
      showRolloverInfo={showTooltip}
      tooltipClassName={helpId
        ? "border-border bg-popover/95 text-left text-popover-foreground shadow-lg"
        : "w-max whitespace-pre-line border-border bg-popover/95 text-center text-popover-foreground shadow-lg"}
    >
      <Button
        size="icon"
        variant={variant}
        className={cn(
          getCompactActionButtonClassName({ isDarkMode, active: isActive }),
          "relative h-8 w-8 rounded-sm p-0",
          buttonClassName,
        )}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        disabled={disabled}
        onClick={onClick}
      >
        {showStatusDot ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-1 top-1 h-1.5 w-1.5 rounded-full ring-1 ring-background",
              statusDotClassName ?? "bg-accent",
            )}
          />
        ) : null}
        {children}
      </Button>
    </DocumentationHoverInfo>
  )
}
