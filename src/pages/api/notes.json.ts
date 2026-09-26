import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { renderMarkdownToHtml } from '@/utils/markdown'

export const prerender = false

const MAX_NOTES = 1000

let sortedNotesCache: Promise<any[]> | null = null

function getSortedNotes() {
  if (!sortedNotesCache) {
    sortedNotesCache = getCollection('notes').then(notes =>
      notes
        .filter(note => import.meta.env.DEV || !note.data.draft)
        .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
        .slice(0, MAX_NOTES),
    )
  }
  return sortedNotesCache
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const lang = url.searchParams.get('lang') || ''
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const limitRaw = Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20
  const limit = Math.min(100, Math.max(1, limitRaw))

  const allNotes = await getSortedNotes()
  const notes = allNotes.filter(note => note.data.lang === lang || note.data.lang === '')
  const items = notes.slice(offset, offset + limit).map((note) => {
    const date = note.data.date instanceof Date ? note.data.date : new Date(note.data.date)
    return {
      id: note.id,
      title: note.data.title,
      date: date.toISOString(),
      image: note.data.image || '',
      tags: note.data.tags || [],
      contentHtml: renderMarkdownToHtml(note.body || ''),
    }
  })

  return new Response(JSON.stringify({
    total: Math.min(notes.length, MAX_NOTES),
    offset,
    limit,
    items,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
