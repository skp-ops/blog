import MarkdownIt from 'markdown-it'
import { parse } from 'node-html-parser'

const markdownParser = new MarkdownIt()

/**
 * Convert a Markdown post body to plain text for full-text search.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) {
    return ''
  }

  const html = markdownParser.render(
    markdown.replace(/<!--[\s\S]*?-->/g, ''),
  )

  return parse(html).textContent.replace(/\s+/g, ' ').trim()
}
