import Link from 'next/link'
import type { Article } from '@/payload-types'
import { formatDate } from '@/content'
import { categories } from '@/site-defaults'

export function ArticleList({ articles, homepage = false }: { articles: Article[]; homepage?: boolean }) {
  if (!articles.length) return <p className="empty">这里还没有文章。</p>

  return <ul className="article-list">
    {articles.map((article, index) => {
      const date = article.publishedAt || article.createdAt
      return <li key={article.id}>
        <Link className="article-row" href={'/articles/' + article.slug}>
          <div>
            <span className="category">{categories[article.category]}</span>
            <h3>{article.title}</h3>
            {(!homepage || index === 0) && article.summary && <p>{article.summary}</p>}
          </div>
          <time dateTime={date}>{formatDate(date)}</time>
        </Link>
      </li>
    })}
  </ul>
}
