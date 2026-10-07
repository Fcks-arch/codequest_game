// "bsit 1-a", "BSIT 1A", "Bsit1 a" -> "BSIT 1-A"
export function normalizeSection(raw) {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_\-.]+/g, ' ')

  if (!cleaned) return ''

  // program letters + year number + optional section letter
  const match = cleaned.match(/^([A-Z ]+?)\s*(\d+)\s*([A-Z]?)$/)
  if (!match) return cleaned // unknown format: just tidy it

  const [, program, year, letter] = match
  return letter
    ? `${program.trim()} ${year}-${letter}`
    : `${program.trim()} ${year}`
}