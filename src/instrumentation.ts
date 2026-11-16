export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' ||
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.LIANGFU_RUN_MEDIA_CLEANUP !== '1' ||
      !process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) return

  const { scheduleMediaCleanup } = await import('./schedule-media-cleanup')
  scheduleMediaCleanup()
}
