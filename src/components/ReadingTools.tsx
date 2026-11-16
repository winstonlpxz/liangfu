'use client'

import { useEffect, useState } from 'react'

export function CopyCode({ code }: { code: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }

  return <button className="copy" type="button" onClick={copy} aria-live="polite">
    {status === 'copied' ? '已复制' : status === 'error' ? '复制失败，重试' : '复制'}
  </button>
}

type Heading = { id: string; label: string; subheading: boolean }

export function Contents() {
  const [headings, setHeadings] = useState<Heading[]>([])

  useEffect(() => {
    setHeadings(Array.from(document.querySelectorAll<HTMLHeadingElement>('#article-body :is(h2,h3)[id]'), (heading) => ({
      id: heading.id,
      label: heading.textContent || '',
      subheading: heading.tagName === 'H3',
    })))
  }, [])

  if (headings.length < 3) return null

  return <nav className="contents" aria-label="文章目录">
    <p>目录</p>
    <ul>{headings.map(({ id, label, subheading }) => <li className={subheading ? 'subheading' : undefined} key={id}>
      <a href={'#' + encodeURIComponent(id)}>{label}</a>
    </li>)}</ul>
  </nav>
}
