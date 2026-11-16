import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { zh } from '@payloadcms/translations/languages/zh'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { APIError, buildConfig, type Access, type CollectionConfig, type GlobalConfig } from 'payload'
import { categories, siteDefaults } from './site-defaults'
import { cosStorage } from './cos-storage'
import { readMedia } from './media-access'
import { ensureMediaAvailable, protectReferencedMedia } from './media-cleanup'
import { pendingMediaPath } from './media-path'

const dataDir = path.resolve(process.env.DATA_DIR || 'data')
mkdirSync(dataDir, { recursive: true })

const signedIn: Access = ({ req }) => Boolean(req.user)

const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '用户', plural: '用户' },
  auth: {
    cookies: { sameSite: 'Lax', secure: process.env.ADMIN_COOKIE_SECURE === 'true' },
  },
  access: {
    create: () => false,
    read: ({ req }) => req.user ? { id: { equals: req.user.id } } : false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
  fields: [],
}

const Media: CollectionConfig = {
  slug: 'media',
  lockDocuments: false,
  hooks: { beforeDelete: [protectReferencedMedia] },
  labels: { singular: '图片', plural: '图片' },
  access: { read: readMedia, create: signedIn, update: signedIn, delete: signedIn },
  upload: {
    staticDir: path.join(dataDir, 'media'),
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      headers.set('X-Content-Type-Options', 'nosniff')
      return headers
    },
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  },
  fields: [{ name: 'alt', label: '图片说明', type: 'text', required: true }],
}

const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: '文章', plural: '文章' },
  versions: { drafts: true, maxPerDoc: 25 },
  access: {
    read: signedIn,
    readVersions: signedIn,
    create: signedIn,
    update: signedIn,
    delete: signedIn,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', '_status', 'updatedAt'],
    preview: (doc) => doc.id ? '/preview/' + doc.id : null,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (typeof data.body === 'string' && data.body.includes('](' + pendingMediaPath)) {
        throw new APIError('请先等图片上传完成，或移除未上传的图片。', 400, undefined, true)
      }
      if (typeof data.body === 'string') await ensureMediaAvailable(data.body, req)
      if (data._status === 'published' && !data.publishedAt && !originalDoc?.publishedAt) {
        data.publishedAt = new Date().toISOString()
      }
      return data
    }],
  },
  fields: [
    { name: 'title', label: '标题', type: 'text', required: true },
    {
      name: 'slug', label: '文章网址', type: 'text', unique: true, index: true, required: true,
      admin: { description: '例如 software-notes，发布后建议保留这个网址。' },
      validate: (value: string | null | undefined) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || '请使用小写英文字母、数字和短横线。',
    },
    {
      name: 'category', label: '分类', type: 'select', required: true, defaultValue: 'essay',
      options: Object.entries(categories).map(([value, label]) => ({ value, label })),
    },
    { name: 'summary', label: '摘要', type: 'textarea' },
    {
      name: 'body', label: '正文（Markdown）', type: 'textarea', required: true,
      admin: {
        description: '可以直接粘贴截图。先保存草稿，再点预览。',
        components: { Field: '@/components/MarkdownField#MarkdownField' },
      },
    },
    { name: 'featured', label: '置顶到首页', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'publishedAt', label: '发布日期', type: 'date', admin: { position: 'sidebar' } },
  ],
}

const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: '站点设置',
  hooks: {
    beforeChange: [async ({ data, req }) => {
      if (typeof data.about === 'string') await ensureMediaAvailable(data.about, req)
      return data
    }],
  },
  access: { read: () => true, update: signedIn },
  fields: [
    { name: 'siteName', label: '站名', type: 'text', defaultValue: siteDefaults.siteName, required: true },
    { name: 'authorName', label: '作者名', type: 'text', defaultValue: siteDefaults.authorName, required: true },
    { name: 'avatar', label: '头像', type: 'upload', relationTo: 'media' },
    { name: 'heroTitle', label: '首页主标题', type: 'text', defaultValue: siteDefaults.heroTitle, required: true },
    { name: 'headline', label: '首页 slogan', type: 'textarea', defaultValue: siteDefaults.headline, required: true },
    { name: 'attribution', label: 'slogan 署名', type: 'text', defaultValue: siteDefaults.attribution },
    { name: 'intro', label: '首页介绍', type: 'textarea', defaultValue: siteDefaults.intro },
    { name: 'about', label: '关于（Markdown）', type: 'textarea', defaultValue: siteDefaults.about },
    { name: 'contactEmail', label: '公开联系邮箱', type: 'email' },
  ],
}

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  i18n: { fallbackLanguage: 'zh', supportedLanguages: { zh } },
  admin: { user: Users.slug, meta: { titleSuffix: ' · 良甫后台' } },
  db: sqliteAdapter({
    push: false,
    client: { url: process.env.DATABASE_URL || 'file:' + path.join(dataDir, 'site.db') },
    migrationDir: path.resolve('src/migrations'),
  }),
  plugins: cosStorage(),
  collections: [Users, Articles, Media],
  globals: [SiteSettings],
  typescript: { outputFile: path.resolve('src/payload-types.ts') },
  graphQL: { disable: true },
  upload: { limits: { fileSize: 8 * 1024 * 1024 } },
})
