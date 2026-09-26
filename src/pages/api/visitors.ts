import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  try {
    const BLOG_LIKES = (locals as any).runtime?.env?.BLOG_LIKES
    const count = BLOG_LIKES
      ? Number.parseInt(await BLOG_LIKES.get('visitor:total') || '0', 10)
      : 0

    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    })
  }
  catch (error) {
    console.error('Error getting visitors:', error)
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const POST: APIRoute = async ({ locals }) => {
  try {
    const BLOG_LIKES = (locals as any).runtime?.env?.BLOG_LIKES
    if (!BLOG_LIKES) {
      return new Response(JSON.stringify({ count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const count = Number.parseInt(await BLOG_LIKES.get('visitor:total') || '0', 10) + 1
    await BLOG_LIKES.put('visitor:total', String(count))

    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('Error incrementing visitors:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
