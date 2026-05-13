export function formatJson(input: string) {
  try {
    return JSON.stringify(JSON.parse(input), null, 2)
  } catch {
    return input
  }
}

export function formatXml(input: string) {
  return input.replace(/>\s*</g, '>\n<').trim()
}
