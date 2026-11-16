import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getSite } from '@/content'
import './site.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite()
  return {
    title: { default: site.siteName, template: '%s · ' + site.siteName },
    description: site.intro || '良甫的随笔与技术文章。',
  }
}

export default async function Layout({ children }: { children: ReactNode }) {
  const site = await getSite()
  return <html lang="zh-CN">
    <body>
      <a className="skip" href="#main">跳到正文</a>
      <header className="top">
        <Link href="/" className="wordmark">{site.siteName}</Link>
        <nav aria-label="主导航">
          <Link href="/articles">文章</Link>
          <Link href="/about">关于</Link>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} {site.authorName}</span>
        {site.contactEmail && <a href={'mailto:' + site.contactEmail}>联系</a>}
      </footer>
    </body>
  </html>
}
