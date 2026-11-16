import { cache } from 'react'
import { notFound } from 'next/navigation'
import { cms } from '@/content'
import { Article } from '@/components/Article'

type Props = { params: Promise<{ slug: string }> }

const getArticle = cache(async (slug: string) => {
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    depth: 0,
    limit: 1,
  })
  if (!docs[0]) notFound()
  return docs[0]
})

export async function generateMetadata({ params }: Props) {
  const article = await getArticle((await params).slug)
  return { title: article.title, description: article.summary || undefined }
}

export default async function Page({ params }: Props) {
  return <Article article={await getArticle((await params).slug)} />
}
