import { APIError, type CollectionBeforeDeleteHook, type Payload, type PayloadRequest } from 'payload'
import { referencedMedia } from './media-access'
import { mediaPath } from './media-path'
import { withMediaWriteLock } from './media-write-lock'

const minimumAge = 24 * 60 * 60 * 1000

async function getReferences(payload: Payload, req?: PayloadRequest) {
  const site = await payload.findGlobal({ slug: 'site-settings', depth: 0, req })
  const filenames = referencedMedia(site.about, true)
  const avatarID = typeof site.avatar === 'object' ? site.avatar?.id : site.avatar

  const articles = await payload.find({
    collection: 'articles',
    where: { body: { contains: mediaPath } },
    select: { body: true },
    pagination: false,
    limit: 0,
    depth: 0,
    req,
  })
  for (const { body } of articles.docs) {
    for (const name of referencedMedia(body, true)) filenames.add(name)
  }

  const versions = await payload.findVersions({
    collection: 'articles',
    where: { 'version.body': { contains: mediaPath } },
    pagination: false,
    limit: 0,
    depth: 0,
    req,
  })
  for (const { version } of versions.docs) {
    for (const name of referencedMedia(version.body, true)) filenames.add(name)
  }

  return { filenames, avatarID }
}

export async function ensureMediaAvailable(body: string, req: PayloadRequest) {
  const filenames = referencedMedia(body)
  if (!filenames.size) return
  const { docs } = await req.payload.find({
    collection: 'media',
    where: { filename: { in: [...filenames] } },
    select: { filename: true },
    depth: 0,
    pagination: false,
    limit: 0,
    req,
  })
  for (const image of docs) {
    if (image.filename) filenames.delete(image.filename)
  }
  if (filenames.size) {
    throw new APIError('正文里有已删除的图片，请重新上传或移除该图片。', 409, undefined, true)
  }
}

export const protectReferencedMedia: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const image = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
  const { filenames, avatarID } = await getReferences(req.payload, req)
  if (image.id === avatarID || (image.filename && filenames.has(image.filename))) {
    throw new APIError('这张图片仍被文章、历史版本或站点设置使用。', 409, undefined, true)
  }
  if (req.context.automaticMediaCleanup &&
    (!image.filename || new Date(image.createdAt).getTime() > Date.now() - minimumAge ||
      new Date(image.updatedAt).getTime() > Date.now() - minimumAge)) {
    throw new APIError('这张图片仍在 24 小时保留期内。', 409, undefined, true)
  }
}

export async function cleanUnusedMedia(payload: Payload, apply: boolean) {
  const cutoff = new Date(Date.now() - minimumAge).toISOString()
  const { filenames, avatarID } = await getReferences(payload)
  const candidates = await payload.find({
    collection: 'media',
    where: { createdAt: { less_than_equal: cutoff }, updatedAt: { less_than_equal: cutoff } },
    depth: 0,
    pagination: false,
    limit: 0,
  })

  let failed = 0
  let count = 0
  for (const image of candidates.docs) {
    if (!image.filename || image.id === avatarID || filenames.has(image.filename)) continue
    if (!apply) {
      console.log('待清理图片 #%s：%s', image.id, image.filename)
      count++
      continue
    }
    try {
      await withMediaWriteLock(() => payload.delete({
        collection: 'media',
        id: image.id,
        context: { automaticMediaCleanup: true },
      }))
      console.log('已清理图片 #%s：%s', image.id, image.filename)
      count++
    } catch (error) {
      if (error instanceof APIError && error.status === 409) {
        console.log('跳过图片 #%s：仍在使用或保留期内。', image.id)
        continue
      }
      failed++
      console.error('清理图片 #%s 失败，可在下次运行时重试。', image.id)
    }
  }
  console.log('%s %s 张图片。', apply ? '已清理' : '可清理', count)
  return failed
}
