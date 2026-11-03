export interface TaxonomySeries {
  id: string
  title: string
  order: number
}

export interface Taxonomy {
  tags: string[]
  series: TaxonomySeries[]
}

export function createEmptyTaxonomy(): Taxonomy {
  return {
    tags: [],
    series: [],
  }
}

export function normalizeTaxonomy(value: unknown): Taxonomy {
  if (!value || typeof value !== 'object')
    return createEmptyTaxonomy()

  const source = value as Record<string, unknown>
  const tags = Array.isArray(source.tags)
    ? [...new Set(source.tags
        .map(tag => String(tag).trim())
        .filter(Boolean))]
    : []

  const seriesIds = new Set<string>()
  const series = Array.isArray(source.series)
    ? source.series.flatMap((entry) => {
        if (!entry || typeof entry !== 'object')
          return []

        const item = entry as Record<string, unknown>
        const id = String(item.id || '').trim().toLowerCase()
        const title = String(item.title || '').trim()
        const order = Number.parseInt(String(item.order || '0'), 10)
        if (!id || !title || seriesIds.has(id))
          return []

        seriesIds.add(id)
        return [{
          id,
          title,
          order: Number.isFinite(order) && order >= 0 ? order : 0,
        }]
      })
    : []

  return { tags, series }
}

export function serializeTaxonomy(taxonomy: Taxonomy) {
  return `${JSON.stringify(normalizeTaxonomy(taxonomy), null, 2)}\n`
}
