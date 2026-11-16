import type { Payload } from 'payload'

export async function getOwner(payload: Payload) {
  const { docs } = await payload.find({ collection: 'users', sort: 'id', depth: 0, limit: 1 })
  return docs[0]
}
