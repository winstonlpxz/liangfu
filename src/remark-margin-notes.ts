import type { Root } from 'mdast'
import type { ContainerDirective } from 'mdast-util-directive'

export function remarkMarginNotes() {
  return (tree: Root) => {
    const blocks: Root['children'] = []

    for (const block of tree.children) {
      if (block.type !== 'containerDirective' || block.name !== 'note') {
        blocks.push(block)
        continue
      }

      block.data = {
        hName: 'aside',
        hProperties: { className: ['margin-note'], ariaLabel: '页边批注' },
      }

      const previous = blocks.at(-1)
      if (previous?.type === 'paragraph') {
        const group: ContainerDirective = {
          type: 'containerDirective',
          name: 'note-group',
          data: { hName: 'div', hProperties: { className: ['margin-note-group'] } },
          children: [previous, block],
        }
        blocks[blocks.length - 1] = group
      } else {
        blocks.push(block)
      }
    }

    tree.children = blocks
  }
}
