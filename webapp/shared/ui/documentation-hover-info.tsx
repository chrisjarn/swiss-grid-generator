import type { ReactNode } from "react"

import {
  DOCUMENTATION_HOVER_INFO_BY_ID,
  type DocumentationHoverInfoId,
  type TooltipBlock,
} from "@/gui/preview/lib/generated-tooltip-content"
import { cn } from "@/lib/utils"
import { HoverTooltip, type HoverTooltipProps } from "@/shared/ui/hover-tooltip"

type DocumentationHoverInfoProps = Omit<HoverTooltipProps, "label" | "disabled"> & {
  label: ReactNode
  helpId?: DocumentationHoverInfoId
  showRolloverInfo?: boolean
  disabled?: boolean
}

function DocumentationHelpContent({
  label,
  helpId,
}: {
  label: ReactNode
  helpId?: DocumentationHoverInfoId
}) {
  const helpItem = helpId ? DOCUMENTATION_HOVER_INFO_BY_ID[helpId] : undefined
  if (!helpItem) return <>{label}</>
  const blocks: readonly TooltipBlock[] = helpItem.blocks

  return (
    <div className="space-y-2 text-left normal-case tracking-normal">
      <div className="font-medium text-foreground">{label}</div>
      <div className="space-y-1.5 border-t border-border pt-2 text-muted-foreground">
        <div className="font-medium text-foreground">{helpItem.title}</div>
        {blocks.map((block, blockIndex) => (
          block.type === "list" ? (
            <ul key={`${helpItem.id}-${blockIndex}`} className="space-y-1 pl-3">
              {block.items.map((item: string) => (
                <li key={item} className="list-disc">{item}</li>
              ))}
            </ul>
          ) : (
            <p key={`${helpItem.id}-${blockIndex}`}>{block.text}</p>
          )
        ))}
      </div>
    </div>
  )
}

export function DocumentationHoverInfo({
  label,
  helpId,
  showRolloverInfo = true,
  disabled = false,
  tooltipClassName,
  ...props
}: DocumentationHoverInfoProps) {
  return (
    <HoverTooltip
      {...props}
      disabled={disabled || !showRolloverInfo}
      label={<DocumentationHelpContent label={label} helpId={helpId} />}
      tooltipClassName={cn(
        "w-80 max-w-[80vw] whitespace-normal border-border bg-popover/95 px-2 py-2 text-[11px] leading-snug text-popover-foreground shadow-lg",
        tooltipClassName,
      )}
    />
  )
}

export type { DocumentationHoverInfoId }
