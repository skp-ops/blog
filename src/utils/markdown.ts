import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

/**
 * Render a Markdown note body into sanitized HTML suitable for a client card.
 */
export function renderMarkdownToHtml(markdown: string): string {
  const html = markdownParser.render(
    (markdown || '').replace(/<!--[\s\S]*?-->/g, ''),
  )

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'figure',
      'figcaption',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      a: ['href', 'name', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}
