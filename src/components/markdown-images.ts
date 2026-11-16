import { StateEffect, StateField, Transaction, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { mediaPath, pendingMediaPath } from '@/media-path'

const maxBytes = 8 * 1024 * 1024
const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])
const refresh = StateEffect.define<void>()
const imageMarkdown = /!\[((?:\\.|[^\]\\\n])*)\]\((\/(?:api\/media\/file|__media-upload)\/[^\s)]+)\)/g

type Upload = { file: File; preview: string; state: 'uploading' | 'failed'; controller?: AbortController }
type ImageControls = { remove?: () => void; retry?: () => void; edit?: () => void }

function markdownImage(url: string, alt: string) {
  return '![' + alt.replace(/[\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ') + '](' + url + ')'
}

class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly alt: string,
    readonly state: Upload['state'] | undefined,
    readonly controls: ImageControls,
  ) { super() }

  toDOM() {
    const card = document.createElement('span')
    card.className = 'markdown-image-card'
    const image = document.createElement('img')
    if (this.url) image.src = this.url
    image.alt = this.alt
    image.loading = 'lazy'
    card.append(image)
    const actions = document.createElement('span')
    actions.className = 'markdown-image-actions'
    card.append(actions)

    if (this.state) {
      const state = document.createElement('span')
      state.textContent = this.state === 'uploading' ? '正在上传…' : '上传失败'
      actions.append(state)
    }

    const button = (text: string, action?: () => void) => {
      if (!action) return
      const node = document.createElement('button')
      node.type = 'button'
      node.textContent = text
      node.addEventListener('click', action)
      actions.append(node)
    }
    button('图片说明', this.controls.edit)
    button('重试', this.controls.retry)
    button('移除', this.controls.remove)
    return card
  }
}

export function markdownImages({
  sourceMode,
  readOnly,
  announce,
}: {
  sourceMode: () => boolean
  readOnly: () => boolean
  announce: (message: string) => void
}) {
  const uploads = new Map<string, Upload>()
  let disposed = false
  let activeView: EditorView | undefined

  function update(view: EditorView) {
    activeView = view
    view.dispatch({ effects: refresh.of() })
  }

  async function upload(view: EditorView, key: string, item: Upload) {
    if (item.controller) return
    const controller = new AbortController()
    item.controller = controller
    item.state = 'uploading'
    update(view)
    try {
      const data = new FormData()
      data.set('file', item.file)
      data.set('_payload', JSON.stringify({ alt: '文章图片' }))
      const response = await fetch('/api/media', { method: 'POST', body: data, signal: controller.signal })
      if (!response.ok) throw new Error('Upload failed')
      const { doc } = await response.json() as { doc?: { filename?: string } }
      if (!doc?.filename) throw new Error('Missing filename')
      if (disposed || controller.signal.aborted) return
      const marker = markdownImage(key, '')
      const position = view.state.doc.toString().indexOf(marker)
      uploads.delete(key)
      URL.revokeObjectURL(item.preview)
      if (position >= 0) {
        const filename = encodeURIComponent(doc.filename).replaceAll('(', '%28').replaceAll(')', '%29')
        view.dispatch({
          changes: { from: position, to: position + marker.length, insert: markdownImage(mediaPath + filename, '') },
          annotations: Transaction.addToHistory.of(false),
        })
        announce('图片已上传。')
      }
    } catch {
      if (disposed || controller.signal.aborted) return
      item.state = 'failed'
      update(view)
      announce('图片上传失败，可以重试或移除。')
    } finally {
      item.controller = undefined
    }
  }

  function insert(view: EditorView, files: File[]) {
    if (readOnly() || !files.length) return
    const accepted = files.filter((file) => types.has(file.type) && file.size > 0 && file.size <= maxBytes)
    if (accepted.length !== files.length) announce('图片需为 PNG、JPEG、WebP、GIF 或 AVIF，且不超过 8 MB。')
    else announce('正在上传图片。')
    if (!accepted.length) return

    const tasks = accepted.map((file) => {
      const key = pendingMediaPath + crypto.randomUUID()
      const item: Upload = { file, preview: URL.createObjectURL(file), state: 'uploading' }
      uploads.set(key, item)
      return { key, item }
    })
    const selection = view.state.selection.main
    const code = findCode(view.state, selection.from)
    const from = code ? view.state.doc.lineAt(code.to).to : selection.from
    const to = code ? from : selection.to
    const images = tasks.map(({ key }) => markdownImage(key, '')).join('\n\n')
    const prefix = from === 0 ? '' : '\n\n'
    const insert = prefix + images + '\n\n'
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
    })
    for (const { key, item } of tasks) void upload(view, key, item)
  }

  function findCode(state: EditorState, position: number) {
    let node = syntaxTree(state).resolveInner(position, 1)
    while (node) {
      if (node.name === 'FencedCode' || node.name === 'CodeBlock') return node
      if (!node.parent) break
      node = node.parent
    }
    return null
  }

  function decorations(state: EditorState) {
    if (sourceMode()) return Decoration.none
    return Decoration.set(Array.from(state.doc.toString().matchAll(imageMarkdown)).flatMap((match) => {
      const [raw, escapedAlt, url] = match
      const from = match.index!
      if (findCode(state, from)) return []
      const to = from + raw.length
      const alt = escapedAlt.replace(/\\([\\[\]])/g, '$1')
      const task = uploads.get(url)
      const pending = url.startsWith(pendingMediaPath)
      const controls: ImageControls = {}
      if (!readOnly() && activeView) {
        const view = activeView
        controls.remove = () => {
          task?.controller?.abort()
          if (task) URL.revokeObjectURL(task.preview)
          uploads.delete(url)
          view.dispatch({ changes: { from, to } })
          view.focus()
          announce('已从正文移除图片。')
        }
        if (task?.state === 'failed') controls.retry = () => { void upload(view, url, task) }
        if (!pending) controls.edit = () => {
          const description = window.prompt('图片说明', alt)
          if (description === null) return
          view.dispatch({ changes: { from, to, insert: markdownImage(url, description) } })
          view.focus()
        }
      }
      return [Decoration.replace({
        widget: new ImageWidget(task?.preview || (pending ? '' : url), alt, task?.state ?? (pending ? 'failed' : undefined), controls),
      }).range(from, to)]
    }))
  }

  const imageField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, transaction) {
      if (!transaction.docChanged && !transaction.effects.some((effect) => effect.is(refresh))) return value
      return decorations(transaction.state)
    },
    provide: (field) => EditorView.decorations.from(field),
  })

  return {
    insert,
    update,
    extension: [
      imageField,
      EditorView.atomicRanges.of((view) => view.state.field(imageField)),
      EditorView.domEventHandlers({
        paste(event, view) {
          const clipboard = event.clipboardData
          const files = Array.from(clipboard?.files ?? [])
          if (!files.length) {
            for (const entry of Array.from(clipboard?.items ?? [])) {
              const file = entry.getAsFile()
              if (file) files.push(file)
            }
          }
          if (readOnly() || !files.some((file) => file.type.startsWith('image/'))) return false
          event.preventDefault()
          insert(view, files)
          return true
        },
      }),
    ],
    dispose() {
      disposed = true
      for (const item of uploads.values()) {
        item.controller?.abort()
        URL.revokeObjectURL(item.preview)
      }
    },
  }
}
