import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import { remarkMarginNotes } from '@/remark-margin-notes'
import remarkGfm from 'remark-gfm'
import { CopyCode } from './ReadingTools'

export function Markdown({ body, id }: { body: string; id?: string }) {
  return <div className="prose" id={id}>
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkDirective, remarkMarginNotes]}
      rehypePlugins={[[rehypeSlug, { prefix: 'section-' }], [rehypeHighlight, { ignoreMissing: true }]]}
      components={{
        aside: ({ children, className, 'aria-label': label }) => (
          <aside className={className} aria-label={label}>
            <div className="margin-note-label" aria-hidden="true">页边批注</div>
            {children}
          </aside>
        ),
        img: ({ src, alt, title }) => <img src={src} alt={alt || ''} title={title} loading="lazy" />,
        table: ({ children }) => <div className="table-wrap" role="region" aria-label="表格" tabIndex={0}><table>{children}</table></div>,
        pre: ({ node, children }) => {
          const code = node?.children[0]
          function plainText(value: NonNullable<typeof code>): string {
            if (value.type === 'text') return value.value
            return value.type === 'element' ? value.children.map(plainText).join('') : ''
          }
          return <div className="code-block">
            <CopyCode code={code ? plainText(code) : ''} />
            <pre>{children}</pre>
          </div>
        },
      }}
    >{body}</ReactMarkdown>
  </div>
}
