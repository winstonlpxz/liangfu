import { getSite } from '@/content'
import { Markdown } from '@/components/Markdown'

export const metadata = { title: '关于' }

export default async function About() {
  const site = await getSite()
  return <article className="reading inner detail">
    <h1>关于</h1>
    <Markdown body={site.about || ''} />
  </article>
}
