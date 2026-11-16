'use client'

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { useField } from '@payloadcms/ui'
import type { TextareaFieldClientComponent } from 'payload'
import { useEffect, useRef, useState } from 'react'
import { markdownImages } from './markdown-images'
import './markdown-field.css'

export const MarkdownField: TextareaFieldClientComponent = ({ field, path, readOnly, validate }) => {
  const { value, setValue, disabled, showError, errorMessage } = useField<string>({
    potentiallyStalePath: path,
    validate: validate ? (value, options) => validate(value, { ...options, name: field.name ?? 'body', type: 'textarea', required: field.required }) : undefined,
  })
  const host = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const instance = useRef<{ view: EditorView; images: ReturnType<typeof markdownImages> } | null>(null)
  const editable = useRef(new Compartment())
  const [source, setSource] = useState(false)
  const [status, setStatus] = useState('')
  const blocked = Boolean(readOnly || disabled)
  const latest = useRef({ value, setValue, blocked, source })
  latest.current = { value, setValue, blocked, source }

  useEffect(() => {
    if (!host.current) return
    const images = markdownImages({
      sourceMode: () => latest.current.source,
      readOnly: () => latest.current.blocked,
      announce: setStatus,
    })
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: latest.current.value || '',
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          EditorView.lineWrapping,
          editable.current.of(EditorState.readOnly.of(latest.current.blocked)),
          EditorView.contentAttributes.of({ 'aria-label': '正文（Markdown）', 'aria-describedby': 'markdown-image-help' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && update.transactions.some((transaction) => !transaction.isUserEvent('external'))) {
              latest.current.setValue(update.state.doc.toString())
            }
          }),
          images.extension,
        ],
      }),
    })
    instance.current = { view, images }
    images.update(view)

    return () => {
      instance.current = null
      images.dispose()
      view.destroy()
    }
  }, [])

  useEffect(() => {
    const view = instance.current?.view
    if (!view || (value || '') === view.state.doc.toString()) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value || '' },
      annotations: [Transaction.userEvent.of('external'), Transaction.addToHistory.of(false)],
    })
  }, [value])

  useEffect(() => {
    const current = instance.current
    if (!current) return
    current.view.dispatch({ effects: editable.current.reconfigure(EditorState.readOnly.of(blocked)) })
    current.images.update(current.view)
  }, [blocked, source])

  return <div className="markdown-editor">
    <div className="markdown-editor-heading">
      <strong>{typeof field.label === 'string' ? field.label : '正文（Markdown）'}</strong>
      <div className="markdown-editor-actions">
        <button type="button" disabled={blocked} onClick={() => fileInput.current?.click()}>插入图片</button>
        <button type="button" aria-pressed={source} onClick={() => setSource(!source)}>Markdown 源码</button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={(event) => {
            const current = instance.current
            if (current) {
              current.images.insert(current.view, Array.from(event.currentTarget.files || []))
              if (source) setSource(false)
              current.view.focus()
            }
            event.currentTarget.value = ''
          }}
        />
      </div>
    </div>
    <p id="markdown-image-help">在正文光标处粘贴截图，或点「插入图片」。上传完成后再保存。</p>
    <div ref={host} className="markdown-editor-input" />
    <div className="markdown-editor-status" role="status">{status}</div>
    {showError && <p role="alert">{String(errorMessage || '请检查正文。')}</p>}
    <details>
      <summary>如何添加页边批注</summary>
      <p>在对应段落后空一行，粘贴下面的写法并替换文字。保存草稿后点「预览」查看效果。</p>
      <pre>{':::note\n这里写批注。\n:::'}</pre>
    </details>
  </div>
}
