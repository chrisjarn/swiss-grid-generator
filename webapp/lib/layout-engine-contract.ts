import {
  createDeterministicFontFileOpticalMarginTextMetricsEngine,
} from "@/lib/font-file-text-metrics-engine"
import type { TextMetricsEngineFactory } from "@/lib/text-metrics-engine"

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
  id: LayoutEngineContractV2["id"]
  version: LayoutEngineContractV2["version"]
  textMetricsEngine: LayoutEngineContractV2["textMetricsEngine"]
  opticalMarginModel: LayoutEngineContractV2["opticalMarginModel"]
  verticalTextBoxModel: LayoutEngineContractV2["verticalTextBoxModel"]
  wrapModel: LayoutEngineContractV2["wrapModel"]
  layerOrderModel: LayoutEngineContractV2["layerOrderModel"]
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
  if (isDeterministicOpticalMarginLayoutEngineContract(payload)) {
    return DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT
  }
  return CURRENT_LAYOUT_ENGINE_CONTRACT
}

export function resolveLayoutTextMetricsEngineFactory<StyleKey extends string, Family extends string>(
  _contract: LayoutEngineContract = CURRENT_LAYOUT_ENGINE_CONTRACT,
): TextMetricsEngineFactory<StyleKey, Family> {
  void _contract
  return createDeterministicFontFileOpticalMarginTextMetricsEngine
}
