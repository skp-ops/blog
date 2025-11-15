import type { APIRoute } from 'astro'

// Enable server-side rendering for this API route
export const prerender = false

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
    // Try to get KV from locals.runtime.env
    const BLOG_LIKES = (locals as any).runtime?.env?.BLOG_LIKES
    
    if (!BLOG_LIKES) {
      console.error('BLOG_LIKES KV namespace not found')
      return new Response(JSON.stringify({ count: 0, error: 'KV not bound' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key = `like:${slug}`
    const count = await BLOG_LIKES.get(key)
    console.log(`GET like:${slug} = ${count}`)
    
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
    const BLOG_LIKES = (locals as any).runtime?.env?.BLOG_LIKES
    
    if (!BLOG_LIKES) {
      console.error('BLOG_LIKES KV namespace not found for POST')
      return new Response(JSON.stringify({ count: 1, error: 'KV not bound' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key = `like:${slug}`
    const currentCount = await BLOG_LIKES.get(key)
    const newCount = parseInt(currentCount || '0', 10) + 1
    
    await BLOG_LIKES.put(key, newCount.toString())
    console.log(`POST like:${slug}: ${currentCount} -> ${newCount}`)
    
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
