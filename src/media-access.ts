import type { Access } from 'payload'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import { visit } from 'unist-util-visit'
import { mediaPath } from './media-path'

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective)
const origin = 'https://liangfu.invalid'

export function referencedMedia(body: string | null | undefined, allowAbsolute = false) {
  const filenames = new Set<string>()
  if (!body) return filenames
  const tree = parser.parse(body)
  const references = new Set<string>()
  const definitions = new Map<string, string>()
  const urls: string[] = []
  visit(tree, 'image', (image) => { urls.push(image.url) })
  visit(tree, 'imageReference', (image) => { references.add(image.identifier) })
  visit(tree, 'definition', (definition) => { definitions.set(definition.identifier, definition.url) })

  for (const reference of references) {
    const url = definitions.get(reference)
    if (url) urls.push(url)
  }

  for (const value of urls) {
    try {
      const url = new URL(value, origin)
      if (!allowAbsolute && url.origin !== origin) continue
      const pathname = decodeURIComponent(url.pathname)
      if (pathname.startsWith(mediaPath)) filenames.add(pathname.slice(mediaPath.length))
    } catch {
      // Ignore malformed URLs.
    }
  }
  return filenames
}

export const readMedia: Access = async ({ req, data, isReadingStaticFile }) => {
  const filename = data?.filename
  if (req.user) return isReadingStaticFile && typeof filename === 'string' ? { filename: { equals: filename } } : true
  if (!isReadingStaticFile || typeof filename !== 'string') return false

  const payload = req.payload
  const site = await payload.findGlobal({ slug: 'site-settings', depth: 1, req, overrideAccess: true })
  if (typeof site.avatar === 'object' && site.avatar?.filename === filename) return { filename: { equals: filename } }
  if (referencedMedia(site.about).has(filename)) return { filename: { equals: filename } }

  const articles = await payload.find({
    collection: 'articles',
    draft: false,
    overrideAccess: true,
    where: {
      _status: { equals: 'published' },
      body: { contains: mediaPath },
    },
    select: { body: true },
    pagination: false,
    limit: 0,
    depth: 0,
    req,
  })

  return articles.docs.some(({ body }) => referencedMedia(body).has(filename)) ? { filename: { equals: filename } } : false
}
