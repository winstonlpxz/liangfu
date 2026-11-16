import config from '@payload-config'
import { withMediaWriteLock } from '@/media-write-lock'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST } from '@payloadcms/next/routes'

type RestHandler = ReturnType<typeof REST_GET>

const userSessionEndpoints = new Set(['GET:me', 'GET:init', 'POST:logout', 'POST:refresh-token'])

function protectOwner(handler: RestHandler): RestHandler {
  return async (request, context) => {
    const { slug } = await context.params
    if (slug?.[0] === 'users' && (
      slug.length !== 2 || !userSessionEndpoints.has(request.method + ':' + slug[1])
    )) return Response.json({ errors: [{ message: '此接口不可用。' }] }, { status: 404 })
    if (slug?.[0] && ['articles', 'media', 'globals'].includes(slug[0]) &&
        ['POST', 'PATCH', 'DELETE'].includes(request.method)) {
      return withMediaWriteLock(() => handler(request, context))
    }
    return handler(request, context)
  }
}

export const GET = protectOwner(REST_GET(config))
export const POST = protectOwner(REST_POST(config))
export const PATCH = protectOwner(REST_PATCH(config))
export const DELETE = protectOwner(REST_DELETE(config))
export const OPTIONS = REST_OPTIONS(config)
