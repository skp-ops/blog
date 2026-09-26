import type { APIRoute } from 'astro'

export const prerender = false

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢']

export const GET: APIRoute = async ({ params, locals }) => {
  const { slug } = params
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const BLOG_LIKES = (locals as any).runtime?.env?.BLOG_LIKES
    if (!BLOG_LIKES) {
      return new Response(JSON.stringify({ counts: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const counts: Record<string, number> = {}
    await Promise.all(EMOJIS.map(async (emoji) => {
      const value = await BLOG_LIKES.get(`reaction:${slug}:${emoji}`)
      counts[emoji] = Number.parseInt(value || '0', 10)
    }))

    return new Response(JSON.stringify({ counts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    })
  }
  catch (error) {
    console.error('Error getting reactions:', error)
    return new Response(JSON.stringify({ counts: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { slug } = params
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let emoji = ''
  try {
    const body = await request.json()
    emoji = typeof body?.emoji === 'string' ? body.emoji : ''
  }
  catch {
    emoji = ''
  }

  if (!EMOJIS.includes(emoji)) {
    return new Response(JSON.stringify({ error: 'Unsupported reaction' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const BLOG_LIKES = (locals as any).runtime?.env?.BLOG_LIKES
    if (!BLOG_LIKES) {
      return new Response(JSON.stringify({ emoji, count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key = `reaction:${slug}:${emoji}`
    const current = await BLOG_LIKES.get(key)
    const count = Number.parseInt(current || '0', 10) + 1
    await BLOG_LIKES.put(key, String(count))

    return new Response(JSON.stringify({ emoji, count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('Error saving reaction:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
