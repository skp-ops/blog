import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { markdownToPlainText } from '@/utils/search'

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts')

  const searchData = posts
    .filter(post => !post.id.startsWith('_') && (import.meta.env.DEV || !post.data.draft))
    .map((post) => {
      // Extract lang from post data or filename
      const matches = post.id.match(/-([a-z]{2})\.md$/)
      const lang = post.data.lang || (matches ? matches[1] : '')

      // Keep the exact same slug rule as the post page route.
      const postSlug = post.data.abbrlink || post.id

      // All posts use the same URL format without language prefix
      const slug = `/posts/${postSlug}/`

      return {
        title: post.data.title,
        slug,
        lang,
        description: post.data.description || '',
        date: post.data.published,
        tags: post.data.tags || [],
        content: markdownToPlainText(post.body || ''),
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
