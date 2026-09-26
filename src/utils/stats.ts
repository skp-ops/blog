/**
 * Rough content length estimate for mixed CJK and Latin text.
 * CJK characters are counted individually; Latin text is counted by word.
 */
export function countWords(content: string): number {
  const text = content || ''
  const cjkCharacters = text.match(
    /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g,
  )?.length ?? 0

  const nonCjk = text
    .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

  const latinWords = nonCjk ? nonCjk.split(/\s+/).length : 0
  return cjkCharacters + latinWords
}

export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { notation: 'standard' }).format(value)
}
