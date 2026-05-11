import { useEffect, useRef, type Dispatch, type SetStateAction } from "react"

type UsePreviewSmartTextZoomControllerArgs<BlockId extends string> = {
  enabled: boolean
  editorTarget: BlockId | null | undefined
  activeTarget: BlockId | null
  geometrySignature: string | null
  typographyPlanVersion: number
  setActiveTarget: Dispatch<SetStateAction<BlockId | null>>
  setTargetVersion: Dispatch<SetStateAction<number>>
}

export function usePreviewSmartTextZoomController<BlockId extends string>({
  enabled,
  editorTarget,
  activeTarget,
  geometrySignature,
  typographyPlanVersion,
  setActiveTarget,
  setTargetVersion,
}: UsePreviewSmartTextZoomControllerArgs<BlockId>) {
  const geometrySignatureRef = useRef<string | null>(null)
  const lastAppliedGeometrySignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !editorTarget) {
      setActiveTarget(null)
      return
    }
    setActiveTarget((current) => (current === editorTarget ? current : editorTarget))
  }, [editorTarget, enabled, setActiveTarget])

  useEffect(() => {
    geometrySignatureRef.current = geometrySignature
  }, [geometrySignature])

  useEffect(() => {
    if (!enabled || !activeTarget) {
      lastAppliedGeometrySignatureRef.current = null
      return
    }
    lastAppliedGeometrySignatureRef.current = geometrySignatureRef.current
  }, [activeTarget, enabled])

  useEffect(() => {
    if (!enabled || !activeTarget) return
    const nextSignature = geometrySignatureRef.current
    if (!nextSignature || lastAppliedGeometrySignatureRef.current === nextSignature) return
    lastAppliedGeometrySignatureRef.current = nextSignature
    setTargetVersion((version) => version + 1)
  }, [activeTarget, enabled, setTargetVersion, typographyPlanVersion])
}
