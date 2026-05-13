import type { Theme } from "vitepress"
import DefaultTheme from "vitepress/theme"
import { defineComponent, h } from "vue"
import "./style.css"

const theme: Theme = {
  extends: DefaultTheme,
  Layout: defineComponent({
    name: "SwissGridDocsLayout",
    setup() {
      return () => h("div", { class: "sgg-docs-layout" }, [h(DefaultTheme.Layout)])
    },
  }),
}

export default theme
