"use client"

function toDigestInput(bytes: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) return bytes
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toDigestInput(bytes))
  return toHex(digest)
}

export function encodeChecksumSidecar(checksum: string): Blob {
  return new Blob([`${checksum.trim().toLowerCase()}\n`], { type: "text/plain;charset=utf-8" })
}

export async function readChecksumSidecar(data: Blob | ArrayBuffer): Promise<string> {
  const text = data instanceof Blob
    ? await data.text()
    : new TextDecoder().decode(data)
  return text.trim().toLowerCase()
}
