import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cms } from '@/content'
import { Article } from '@/components/Article'

export const metadata = { title: '预览', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) notFound()

  const { id } = await params
  if (!/^[1-9][0-9]*$/.test(id)) notFound()

  const article = await payload.findByID({
    collection: 'articles', id, draft: true, depth: 0, user, overrideAccess: false, disableErrors: true,
  })
  if (!article) notFound()
  return <Article article={article} preview />
}
