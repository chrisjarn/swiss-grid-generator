import type jsPDF from "jspdf"
import {
  FONT_DEFINITIONS,
  getFontAssetPath,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"

export type PdfFontRegistrationFace = {
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
}

type FontAsset = { vfsName: string; url: string }

const fontBinaryCache = new Map<string, Promise<string>>()
const KNOWN_FONT_FAMILIES = new Set<FontFamily>(FONT_DEFINITIONS.map((entry) => entry.value))

type PdfWithRegistry = jsPDF & {
  __sggRegisteredFonts?: Set<string>
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function fetchFontBase64(url: string): Promise<string> {
  const cached = fontBinaryCache.get(url)
  if (cached) return cached
  const task = (async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load required font asset: ${url} (${response.status})`)
    }
    const buffer = await response.arrayBuffer()
    return arrayBufferToBase64(buffer)
  })()
  fontBinaryCache.set(url, task)
  return task
}

function getFontSlug(fontFamily: FontFamily): string {
  return fontFamily.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getPdfEmbeddedFamilyName(fontFamily: FontFamily): string {
  return `Embedded_${getFontSlug(fontFamily)}`
}

function getPdfEmbeddedWeightFamilyName(fontFamily: FontFamily, weight: number): string {
  // Keep weight in the PDF resource name because some local static font files
  // carry generic internal names such as "Inter-Regular" across all weights.
  return `${getPdfEmbeddedFamilyName(fontFamily)}_${weight}`
}

function getPdfStyle(italic: boolean): "normal" | "italic" {
  return italic ? "italic" : "normal"
}

function getPdfRegistrationKey(pdfFamily: string, italic: boolean): string {
  return `${pdfFamily}:${getPdfStyle(italic)}`
}

function markFontRegistered(pdf: PdfWithRegistry, key: string): void {
  if (!pdf.__sggRegisteredFonts) pdf.__sggRegisteredFonts = new Set<string>()
  pdf.__sggRegisteredFonts.add(key)
}

function isFontRegistered(pdf: PdfWithRegistry, key: string): boolean {
  return pdf.__sggRegisteredFonts?.has(key) ?? false
}

function resolvePdfFontFace(face: PdfFontRegistrationFace): Required<PdfFontRegistrationFace> {
  const resolvedVariant = resolveFontVariant(face.fontFamily, face.fontWeight, face.italic)
  return {
    fontFamily: face.fontFamily,
    fontWeight: resolvedVariant.weight,
    italic: resolvedVariant.italic,
  }
}

function getFontFaceCacheKey(face: PdfFontRegistrationFace): string {
  const resolved = resolvePdfFontFace(face)
  return `${resolved.fontFamily}:${resolved.fontWeight}:${resolved.italic ? "italic" : "normal"}`
}

function getLocalFontAsset(face: PdfFontRegistrationFace): FontAsset {
  const resolved = resolvePdfFontFace(face)
  const slug = getFontSlug(resolved.fontFamily)
  return {
    vfsName: `${slug}-${resolved.fontWeight}${resolved.italic ? "italic" : ""}.ttf`,
    url: getFontAssetPath(resolved.fontFamily, resolved.fontWeight, resolved.italic),
  }
}

async function registerFontFace(pdf: PdfWithRegistry, face: PdfFontRegistrationFace): Promise<void> {
  const resolved = resolvePdfFontFace(face)
  if (!KNOWN_FONT_FAMILIES.has(resolved.fontFamily)) return
  const pdfFamily = getPdfEmbeddedWeightFamilyName(resolved.fontFamily, resolved.fontWeight)
  const fontStyle = getPdfStyle(resolved.italic)
  const registrationKey = getPdfRegistrationKey(pdfFamily, resolved.italic)
  if (isFontRegistered(pdf, registrationKey)) return

  const addFileToVFS = pdf.addFileToVFS?.bind(pdf)
  const addFont = pdf.addFont?.bind(pdf)
  if (typeof addFileToVFS !== "function" || typeof addFont !== "function") {
    throw new Error("jsPDF font APIs are not available in this environment")
  }

  const asset = getLocalFontAsset(resolved)
  const fontBase64 = await fetchFontBase64(asset.url)
  addFileToVFS(asset.vfsName, fontBase64)
  addFont(asset.vfsName, pdfFamily, fontStyle)
  markFontRegistered(pdf, registrationKey)
}

export async function preloadPdfFontFaces(faces: Iterable<PdfFontRegistrationFace>): Promise<void> {
  const unique = new Map<string, PdfFontRegistrationFace>()
  for (const face of faces) {
    const resolved = resolvePdfFontFace(face)
    if (!KNOWN_FONT_FAMILIES.has(resolved.fontFamily)) continue
    unique.set(getFontFaceCacheKey(resolved), resolved)
  }
  await Promise.all([...unique.values()].map((face) => fetchFontBase64(getLocalFontAsset(face).url)))
}

export async function ensurePdfFontFacesRegistered(
  pdf: jsPDF,
  faces: Iterable<PdfFontRegistrationFace>,
): Promise<void> {
  const unique = new Map<string, PdfFontRegistrationFace>()
  for (const face of faces) {
    const resolved = resolvePdfFontFace(face)
    if (!KNOWN_FONT_FAMILIES.has(resolved.fontFamily)) continue
    unique.set(getFontFaceCacheKey(resolved), resolved)
  }
  await Promise.all([...unique.values()].map((face) => registerFontFace(pdf as PdfWithRegistry, face)))
}

export async function ensurePdfFontsRegistered(
  pdf: jsPDF,
  fontFamilies: Iterable<FontFamily>,
): Promise<void> {
  const faces = [...new Set(fontFamilies)].map((fontFamily) => ({
    fontFamily,
    fontWeight: 400,
    italic: false,
  }))
  await ensurePdfFontFacesRegistered(pdf, faces)
}

export function resolvePdfFontFamily(fontFamily: FontFamily, weight: number): string | null {
  if (!KNOWN_FONT_FAMILIES.has(fontFamily)) return null
  const resolvedVariant = resolveFontVariant(fontFamily, weight, false)
  return getPdfEmbeddedWeightFamilyName(fontFamily, resolvedVariant.weight)
}
