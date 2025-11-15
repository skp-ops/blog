import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { defaultLocale } from '@/config'

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts')
  
  const searchData = posts
    .filter(post => !post.id.startsWith('_') && !post.data.draft)
    .map(post => {
      // Extract lang from post data or filename
      const matches = post.id.match(/-([a-z]{2})\.md$/)
      const lang = post.data.lang || (matches ? matches[1] : defaultLocale)
      
      // Use abbrlink for slug (fallback to filename if not set)
      const postSlug = post.data.abbrlink || post.id.replace(/\.md$/, '').split('/').pop()
      
      // All posts use the same URL format without language prefix
      const slug = `/posts/${postSlug}/`
      
      return {
        title: post.data.title,
        slug: slug,
        lang: lang,
        description: post.data.description || '',
        date: post.data.published,
        tags: post.data.tags || [],
      }
    })
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })

  return new Response(JSON.stringify(searchData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
