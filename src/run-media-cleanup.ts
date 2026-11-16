import { getPayload } from 'payload'
import config from './payload.config'
import { cleanUnusedMedia } from './media-cleanup'

const mode = process.argv[2]
if (mode && mode !== 'apply') throw new Error('Usage: npm run media:cleanup -- [apply]')

const payload = await getPayload({ config })
try {
  if (await cleanUnusedMedia(payload, mode === 'apply')) process.exitCode = 1
} finally {
  await payload.destroy()
}
