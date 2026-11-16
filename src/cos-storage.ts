import { DeleteObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
import { getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities'
import { APIError, type CollectionBeforeDeleteHook, type Config } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'

const collectionPrefix = 'liangfu-media'

export function cosStorage() {
  const {
    COS_BUCKET: bucket,
    COS_REGION: region,
    COS_SECRET_ID: accessKeyId,
    COS_SECRET_KEY: secretAccessKey,
  } = process.env

  const enabled = Boolean(accessKeyId || secretAccessKey)
  if (enabled && (!bucket || !region || !accessKeyId || !secretAccessKey)) {
    throw new Error('COS requires COS_BUCKET, COS_REGION, COS_SECRET_ID and COS_SECRET_KEY.')
  }
  if (enabled && (!/^[a-z0-9][a-z0-9-]*-\d+$/.test(bucket!) || !/^[a-z]+(?:-[a-z0-9]+)+$/.test(region!))) {
    throw new Error('Invalid COS bucket name or region.')
  }

  const config: S3ClientConfig = {
    endpoint: 'https://cos.' + region + '.myqcloud.com',
    region,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  }
  const configureStorage = s3Storage({
    enabled,
    alwaysInsertFields: true,
    bucket: bucket || '',
    collections: { media: { prefix: collectionPrefix } },
    config,
  })

  if (!enabled) return [configureStorage]

  const client = new S3Client({ ...config, maxAttempts: 2 })
  const deleteCloudFile: CollectionBeforeDeleteHook = async ({ collection, id, req }) => {
    const image = await req.payload.findByID({
      collection: 'media', id, depth: 0, showHiddenFields: true, req,
    })
    if (!image.filename) return
    const key = await getStorageFilePath({
      collection,
      collectionPrefix,
      doc: { ...image, prefix: image.prefix ?? undefined, _objectKey: image._objectKey ?? undefined },
      filename: image.filename,
      req,
    })
    if (!key.startsWith(collectionPrefix + '/')) {
      throw new APIError('图片不在站点专用存储目录下。', 409, undefined, true)
    }
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      req.payload.logger.error({
        mediaID: id, errorType: error instanceof Error ? error.name : 'Unknown',
      }, 'COS 图片删除失败')
      throw new APIError('COS 删除失败，图片记录已保留，请重试。', 502, undefined, true)
    }
  }

  return [async (incoming: Config) => {
    const configured = await configureStorage(incoming)
    return {
      ...configured,
      collections: configured.collections?.map((collection) => {
        if (collection.slug !== 'media') return collection
        const original = incoming.collections?.find(({ slug }) => slug === 'media')

        // The adapter's afterDelete hook logs cloud failures after the record is gone.
        // Fail before deleting the record so the next run still has the object key.
        return {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeDelete: [...collection.hooks?.beforeDelete ?? [], deleteCloudFile],
            afterDelete: original?.hooks?.afterDelete,
          },
        }
      }),
    }
  }]
}
