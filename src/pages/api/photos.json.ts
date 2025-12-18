import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

// API should be dynamic (supports pagination)
export const prerender = false

const toStr = (v: unknown) => (v === undefined || v === null ? '' : String(v))

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)

  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const limitRaw = Number.parseInt(url.searchParams.get('limit') || '30', 10) || 30
  const limit = Math.min(60, Math.max(1, limitRaw))

  const photos = await getCollection('photos')

  const sorted = photos
    .slice()
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())

  const total = sorted.length
  const items = sorted.slice(offset, offset + limit).map((photo) => ({
    id: photo.id,
    image: photo.data.image,
    thumbnail: photo.data.thumbnail || '',
    title: photo.data.title,
    location: toStr(photo.data.location),
    description: toStr(photo.data.description),
    date: new Date(photo.data.date).toISOString(),
    camera: toStr((photo.data as any).camera),
    lens: toStr((photo.data as any).lens),
    iso: toStr((photo.data as any).iso),
    aperture: toStr((photo.data as any).aperture),
    shutter: toStr((photo.data as any).shutter),
    focalLength: toStr((photo.data as any).focalLength),
  }))

  return new Response(JSON.stringify({ total, offset, limit, items }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // safe-ish caching (content changes are infrequent; still allow revalidation)
      'Cache-Control': 'public, max-age=60',
    },
  })
}
