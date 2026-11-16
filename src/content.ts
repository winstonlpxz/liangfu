import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { categories, siteDefaults } from './site-defaults'

export const cms = () => getPayload({ config })

export const getSite = cache(async () => {
  const payload = await cms()
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  return { ...siteDefaults, ...settings }
})

export async function getArticles(category?: keyof typeof categories, home = false) {
  const payload = await cms()
  const where: Where = {
    _status: { equals: 'published' },
    ...(category && { category: { equals: category } }),
  }
  return payload.find({
    collection: 'articles',
    where,
    sort: home ? ['-featured', '-publishedAt', '-createdAt'] : ['-publishedAt', '-createdAt'],
    depth: 0,
    limit: home ? 4 : 0,
    pagination: false,
  })
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai',
  }).format(new Date(value)).replaceAll('/', '.')
}
