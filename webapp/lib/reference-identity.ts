const referenceIdentityTokens = new WeakMap<object, number>()
let nextReferenceIdentityToken = 1

export function getReferenceIdentityToken(value: object | null | undefined): number {
  if (!value) return 0
  const existing = referenceIdentityTokens.get(value)
  if (typeof existing === "number") return existing
  const created = nextReferenceIdentityToken
  nextReferenceIdentityToken += 1
  referenceIdentityTokens.set(value, created)
  return created
}
