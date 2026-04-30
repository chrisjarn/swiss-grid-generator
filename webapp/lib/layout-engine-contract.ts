import {
  createDeterministicFontFileOpticalMarginTextMetricsEngine,
  createDeterministicFontFileTextMetricsEngine,
} from "@/lib/font-file-text-metrics-engine"
import type { TextMetricsEngineFactory } from "@/lib/text-metrics-engine"

type LayoutEngineContractV1 = {
  id: "swiss-grid-layout-v1"
  version: 1
  textMetricsEngine: "font-file-deterministic-v1"
  opticalMarginModel: "browser-canvas-compat-v1"
  verticalTextBoxModel: "cap-top-legacy-descent-0.2em"
  wrapModel: "font-file-width-tracking-optical-v1"
  layerOrderModel: "explicit-layer-order-v1"
}

type LayoutEngineContractV2 = {
  id: "swiss-grid-layout-v2"
  version: 2
  textMetricsEngine: "font-file-deterministic-optical-margin-v1"
  opticalMarginModel: "font-file-contour-optical-margin-v1"
  verticalTextBoxModel: "cap-top-legacy-descent-0.2em"
  wrapModel: "font-file-width-tracking-optical-v1"
  layerOrderModel: "explicit-layer-order-v1"
}

export type LayoutEngineContract = {
  id: LayoutEngineContractV1["id"] | LayoutEngineContractV2["id"]
  version: LayoutEngineContractV1["version"] | LayoutEngineContractV2["version"]
  textMetricsEngine: LayoutEngineContractV1["textMetricsEngine"] | LayoutEngineContractV2["textMetricsEngine"]
  opticalMarginModel: LayoutEngineContractV1["opticalMarginModel"] | LayoutEngineContractV2["opticalMarginModel"]
  verticalTextBoxModel: LayoutEngineContractV1["verticalTextBoxModel"]
  wrapModel: LayoutEngineContractV1["wrapModel"]
  layerOrderModel: LayoutEngineContractV1["layerOrderModel"]
}

export const LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT: LayoutEngineContract = {
  id: "swiss-grid-layout-v1",
  version: 1,
  textMetricsEngine: "font-file-deterministic-v1",
  opticalMarginModel: "browser-canvas-compat-v1",
  verticalTextBoxModel: "cap-top-legacy-descent-0.2em",
  wrapModel: "font-file-width-tracking-optical-v1",
  layerOrderModel: "explicit-layer-order-v1",
}

export const DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT: LayoutEngineContract = {
  id: "swiss-grid-layout-v2",
  version: 2,
  textMetricsEngine: "font-file-deterministic-optical-margin-v1",
  opticalMarginModel: "font-file-contour-optical-margin-v1",
  verticalTextBoxModel: "cap-top-legacy-descent-0.2em",
  wrapModel: "font-file-width-tracking-optical-v1",
  layerOrderModel: "explicit-layer-order-v1",
}

export const CURRENT_LAYOUT_ENGINE_CONTRACT: LayoutEngineContract =
  DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT

function isLegacyBrowserCompatLayoutEngineContract(
  payload: Partial<Record<keyof LayoutEngineContract, unknown>>,
): boolean {
  return payload.id === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.id
    && payload.version === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.version
    && payload.textMetricsEngine === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.textMetricsEngine
    && (
      payload.opticalMarginModel === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.opticalMarginModel
      || payload.opticalMarginModel === undefined
    )
    && payload.verticalTextBoxModel === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.verticalTextBoxModel
    && payload.wrapModel === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.wrapModel
    && payload.layerOrderModel === LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT.layerOrderModel
}

function isDeterministicOpticalMarginLayoutEngineContract(
  payload: Partial<Record<keyof LayoutEngineContract, unknown>>,
): boolean {
  return payload.id === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.id
    && payload.version === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.version
    && payload.textMetricsEngine === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.textMetricsEngine
    && payload.opticalMarginModel === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.opticalMarginModel
    && payload.verticalTextBoxModel === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.verticalTextBoxModel
    && payload.wrapModel === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.wrapModel
    && payload.layerOrderModel === DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT.layerOrderModel
}

export function parseLayoutEngineContract(source: unknown): LayoutEngineContract {
  if (typeof source !== "object" || source === null) return CURRENT_LAYOUT_ENGINE_CONTRACT
  const payload = source as Partial<Record<keyof LayoutEngineContract, unknown>>
  if (isLegacyBrowserCompatLayoutEngineContract(payload)) {
    return LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT
  }
  if (isDeterministicOpticalMarginLayoutEngineContract(payload)) {
    return DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT
  }
  return CURRENT_LAYOUT_ENGINE_CONTRACT
}

export function resolveLayoutTextMetricsEngineFactory<StyleKey extends string, Family extends string>(
  contract: LayoutEngineContract = CURRENT_LAYOUT_ENGINE_CONTRACT,
): TextMetricsEngineFactory<StyleKey, Family> {
  switch (contract.textMetricsEngine) {
    case "font-file-deterministic-optical-margin-v1":
      return createDeterministicFontFileOpticalMarginTextMetricsEngine
    case "font-file-deterministic-v1":
    default:
      return createDeterministicFontFileTextMetricsEngine
  }
}
