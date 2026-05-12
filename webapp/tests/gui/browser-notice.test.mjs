import test from "node:test"
import assert from "node:assert/strict"

import {
  formatBrowserNoticeMessage,
  showBrowserNotice,
} from "../../gui/shell/lib/browser-notice.ts"

test("formatBrowserNoticeMessage separates title and message for browser notices", () => {
  assert.equal(
    formatBrowserNoticeMessage({ title: "Field unchanged", message: "Layers exceed the field." }),
    "Field unchanged\n\nLayers exceed the field.",
  )
  assert.equal(
    formatBrowserNoticeMessage({ title: "Saved", message: "" }),
    "Saved",
  )
})

test("showBrowserNotice uses alert for informational notices", () => {
  const previousWindow = globalThis.window
  const messages = []
  globalThis.window = {
    alert: (message) => messages.push(message),
    confirm: () => {
      throw new Error("confirm should not be called")
    },
  }

  try {
    showBrowserNotice({ title: "Saved", message: "Project stored locally." })
    assert.deepEqual(messages, ["Saved\n\nProject stored locally."])
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
})

test("showBrowserNotice uses confirm for actionable notices", () => {
  const previousWindow = globalThis.window
  const events = []
  globalThis.window = {
    alert: () => {
      throw new Error("alert should not be called")
    },
    confirm: (message) => {
      events.push(message)
      return false
    },
  }

  try {
    showBrowserNotice({
      title: "Delete page",
      message: "This removes the page.",
      onConfirm: () => events.push("confirm"),
      onCancel: () => events.push("cancel"),
    })
    assert.deepEqual(events, ["Delete page\n\nThis removes the page.", "cancel"])
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
})
