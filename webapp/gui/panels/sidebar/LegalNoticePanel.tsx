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
        body: "text-[#A8B1BF]",
        emphasis: "text-[#F4F6F8]",
        caption: "text-[#8D98AA]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        link: "text-blue-400 hover:underline",
      }
    : {
        body: "text-gray-600",
        emphasis: "text-gray-900",
        caption: "text-gray-400",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        link: "text-blue-600 hover:underline",
      }

  const noteSection = LEGAL_CONTENT_SECTIONS.find((section) => section.title.toLowerCase() === "note")
  const contentSections = LEGAL_CONTENT_SECTIONS.filter((section) => section.title.toLowerCase() !== "note")

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <SectionHeaderRow
          label={t("rightPanel.legal.title")}
          actionIcon={<X className="h-2 w-2" />}
          actionLabel={t("rightPanel.legal.close")}
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
