import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'
import { getArticles } from '@/content'
import { categories } from '@/site-defaults'

export const metadata = { title: '文章' }

export default async function Articles({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const selected = category === 'essay' || category === 'technical' ? category : undefined
  const { docs } = await getArticles(selected)

  return <section className="reading inner">
    <h1>文章</h1>
    <nav className="filters" aria-label="文章分类">
      <Link href="/articles" aria-current={!selected ? 'page' : undefined}>全部</Link>
      {Object.entries(categories).map(([value, label]) => (
        <Link key={value} href={'/articles?category=' + value} aria-current={selected === value ? 'page' : undefined}>{label}</Link>
      ))}
    </nav>
    <ArticleList articles={docs} />
  </section>
}
