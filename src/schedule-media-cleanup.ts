import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'
import config from './payload.config'
import { cleanUnusedMedia } from './media-cleanup'

const hour = 60 * 60 * 1000
const stamp = path.resolve(process.env.DATA_DIR || 'data', 'media-cleanup.last-run')
const processState = globalThis as typeof globalThis & { liangfuMediaCleanupStarted?: boolean }

export function scheduleMediaCleanup() {
  if (processState.liangfuMediaCleanupStarted) return
  processState.liangfuMediaCleanupStarted = true

  let running = false
  async function run() {
    if (running) return
    running = true
    try {
      const lastRun = await readFile(stamp, 'utf8').catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
        return '0'
      })
      if (Date.now() - Number(lastRun) < 24 * hour) return
      const payload = await getPayload({ config })
      await cleanUnusedMedia(payload, true)
      await writeFile(stamp, String(Date.now()) + '\n')
    } catch (error) {
      console.error('图片清理任务失败，稍后会重试。', error instanceof Error ? error.name : 'Unknown')
    } finally {
      running = false
    }
  }

  setTimeout(() => { void run() }, Math.round(hour / 12)).unref()
  setInterval(() => { void run() }, hour).unref()
}
