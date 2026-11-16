import Link from 'next/link'
import { getArticles, getSite } from '@/content'
import { ArticleList } from '@/components/ArticleList'

export default async function Home() {
  const [site, { docs }] = await Promise.all([getSite(), getArticles(undefined, true)])
  const avatar = typeof site.avatar === 'object' ? site.avatar : null

  return <>
    <section className="hero">
      {avatar?.url && <img className="avatar" src={avatar.url} alt={avatar.alt} width={72} height={72} />}
      <h1>{site.heroTitle}</h1>
      <figure className="slogan">
        <blockquote lang="en">{site.headline}</blockquote>
        {site.attribution && <figcaption lang="en">{site.attribution}</figcaption>}
      </figure>
      {site.intro && <p className="intro">{site.intro}</p>}
    </section>
    <section className="reading recent" aria-labelledby="recent-heading">
      <div className="section-head">
        <h2 id="recent-heading">近作</h2>
        <Link href="/articles">全部文章 <span aria-hidden="true">↗</span></Link>
      </div>
      <ArticleList articles={docs} homepage />
    </section>
  </>
}
