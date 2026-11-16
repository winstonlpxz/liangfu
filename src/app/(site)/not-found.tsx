import Link from 'next/link'

export default function NotFound() {
  return <section className="reading inner">
    <h1>找不到这个页面</h1>
    <p><Link href="/articles">查看全部文章</Link></p>
  </section>
}
