import { X } from "lucide-react"
import type { ReactNode } from "react"

import { LEGAL_CONTENT_SECTIONS } from "@/gui/panels/sidebar/lib/generated-legal-content"
import { useTranslation } from "@/lib/i18n"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
}

type Tone = {
  body: string
  emphasis: string
  caption: string
  action: string
  link: string
}

function renderInlineContent(text: string, tone: Tone, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)| {2}\n|\n)/g
  return text.split(tokenPattern).flatMap((segment, index) => {
    if (!segment) return []
    const key = `${keyPrefix}-${index}`
    if (segment === "\n" || segment === "  \n") return <br key={key} />
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <span key={key} className={`font-medium ${tone.emphasis}`}>
          {segment.slice(2, -2)}
        </span>
      )
    }
    const linkMatch = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a key={key} href={linkMatch[2]} className={tone.link}>
          {linkMatch[1]}
        </a>
      )
    }
    return <span key={key}>{segment}</span>
  })
}

export function LegalNoticePanel({ isDarkMode = false, onClose }: Props) {
  const { t } = useTranslation()
  const tone: Tone = isDarkMode
    ? {
        body: "text-muted-foreground",
        emphasis: "text-foreground",
        caption: "text-muted-foreground",
        action: "border-border bg-surface text-muted-foreground hover:bg-panel hover:text-foreground",
        link: "text-accent-foreground hover:underline",
      }
    : {
        body: "text-muted-foreground",
        emphasis: "text-foreground",
        caption: "text-muted-foreground",
        action: "border-border bg-panel text-muted-foreground hover:bg-surface hover:text-foreground",
        link: "text-accent-foreground hover:underline",
      }

  const noteSection = LEGAL_CONTENT_SECTIONS.find((section) => section.title.toLowerCase() === "note")
  const contentSections = LEGAL_CONTENT_SECTIONS.filter((section) => section.title.toLowerCase() !== "note")

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <SectionHeaderRow
          label={t("ui.panels.sidebar.legal.title")}
          actionIcon={<X className="h-2 w-2" />}
          actionLabel={t("ui.panels.sidebar.legal.close")}
          actionClassName={tone.action}
          onActionClick={onClose}
        />
      </div>

      {contentSections.map((section, sectionIndex) => (
        <section key={section.title} className={`space-y-2 ${sectionIndex > 0 ? "pt-[13px]" : ""}`}>
          <SectionHeaderRow label={section.title} />
          {section.blocks.map((block, blockIndex) => (
            <p key={`${section.title}-${blockIndex}`} className={`text-xs leading-relaxed ${tone.body}`}>
              {renderInlineContent(block.text, tone, `${section.title}-${blockIndex}`)}
            </p>
          ))}
        </section>
      ))}

      {noteSection ? (
        <section className="pt-[13px]">
          {noteSection.blocks.map((block, blockIndex) => (
            <p key={`note-${blockIndex}`} className={`text-[11px] leading-relaxed ${tone.caption}`}>
              {renderInlineContent(block.text, tone, `note-${blockIndex}`)}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  )
}
