import type { AstroIntegration } from 'astro'

export default function contentStudioIntegration(): AstroIntegration {
  return {
    name: 'content-studio',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({
          pattern: '/admin',
          entrypoint: './src/studio/admin.astro',
        })
        injectRoute({
          pattern: '/api/studio/content',
          entrypoint: './src/studio/api.ts',
        })
        injectRoute({
          pattern: '/api/studio/commit',
          entrypoint: './src/studio/api.ts',
        })
      },
    },
  }
}
