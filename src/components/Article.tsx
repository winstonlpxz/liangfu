import Link from 'next/link'
import { formatDate } from '@/content'
import type { Article as ArticleData } from '@/payload-types'
import { categories } from '@/site-defaults'
import { Markdown } from './Markdown'
import { Contents } from './ReadingTools'

export function Article({ article, preview = false }: { article: ArticleData; preview?: boolean }) {
  const date = article.publishedAt || article.createdAt
  return <article className="reading inner detail">
    <Link className="back" href={preview ? '/admin/collections/articles/' + article.id : '/articles'}>
      ← {preview ? '返回编辑' : '全部文章'}
    </Link>
    {preview && <p role="status" className="preview-note">后台预览 · 仅登录后可见</p>}
    <header>
      <p className="article-meta"><span>{categories[article.category]}</span><time dateTime={date}>{formatDate(date)}</time></p>
      <h1>{article.title || '未命名文章'}</h1>
      {article.summary && <p className="dek">{article.summary}</p>}
    </header>
    {article.category === 'technical' && <Contents />}
    <Markdown body={article.body || ''} id="article-body" />
  </article>
}
