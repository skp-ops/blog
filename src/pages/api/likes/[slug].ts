import type { APIRoute } from 'astro'

// Enable server-side rendering for this API route
export const prerender = false

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

type Env = {
  BLOG_LIKES: KVNamespace
}

// GET /api/likes/:slug - Get like count for a post
export const GET: APIRoute = async ({ params, locals }) => {
  const { slug } = params
  
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const runtime = (locals as any).runtime as { env: Env } | undefined
    const env = runtime?.env
    
    if (!env?.BLOG_LIKES) {
      console.log('KV not available, returning 0')
      return new Response(JSON.stringify({ count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key = `like:${slug}`
    const count = await env.BLOG_LIKES.get(key)
    
    return new Response(JSON.stringify({ count: parseInt(count || '0', 10) }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error getting likes:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', count: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// POST /api/likes/:slug - Increment like count
export const POST: APIRoute = async ({ params, locals }) => {
  const { slug } = params
  
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const runtime = (locals as any).runtime as { env: Env } | undefined
    const env = runtime?.env
    
    if (!env?.BLOG_LIKES) {
      console.log('KV not available for POST')
      return new Response(JSON.stringify({ count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key = `like:${slug}`
    const currentCount = await env.BLOG_LIKES.get(key)
    const newCount = parseInt(currentCount || '0', 10) + 1
    
    await env.BLOG_LIKES.put(key, newCount.toString())
    
    return new Response(JSON.stringify({ count: newCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error incrementing likes:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
