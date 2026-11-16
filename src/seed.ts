import config from './payload.config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

const samples = [
  {
    slug: 'let-a-question-sit',
    note: '重读旧笔记时，我现在会先看当时是怎么问的。问题后来变了，也值得记下来。',
    title: '有些问题，可以暂时没有答案',
    category: 'essay' as const,
    summary: '一篇示例随笔，写的是重读一条旧笔记时的发现。',
    body: '我翻到一条三个月前的笔记。那时我觉得非做决定不可。现在再看，事情没有解决，但已经可以把问题说得更准确一点了。\n\n有时候写下来就够了。等过些日子再回来，看看还有哪一句是真的想说。',
    publishedAt: '2026-11-12T08:00:00.000+08:00',
  },
  {
    slug: 'idempotent-retries',
    note: '排查重试时，我会先对照两次请求的幂等键。键变了，服务端就会当成两次独立操作。',
    title: '给一个写入接口加上幂等键',
    category: 'technical' as const,
    summary: '一篇技术示例，演示代码高亮、表格和文章目录。',
    body: [
      '客户端超时，并不能告诉我们服务端有没有写入成功。要安全地重试，需要为同一次操作保留同一个标识。',
      '## 标识一次操作',
      '发起请求前生成一个键，并和待提交的数据一起保存。每次重试都带上同一个键。',
      '```ts\nawait fetch("/api/notes", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Idempotency-Key": pendingNote.idempotencyKey,\n  },\n  body: JSON.stringify(pendingNote.content),\n})\n```',
      '## 在服务端原子写入',
      '以调用者和幂等键建立唯一约束。记录幂等键和写入业务数据需要在同一个事务里完成。',
      '| 请求 | 处理方式 |\n| --- | --- |\n| 新键 | 执行写入 |\n| 已处理的键，数据相同 | 返回原结果 |\n| 已处理的键，数据不同 | 拒绝请求 |',
      '## 验证重试',
      '让客户端在服务端提交之后、收到响应之前断开。再次发送同一请求，确认只出现一条业务记录。',
    ].join('\n\n'),
    publishedAt: '2026-11-03T08:00:00.000+08:00',
  },
  {
    slug: 'walk-without-a-destination',
    title: '散步时不一定要走到哪里',
    category: 'essay' as const,
    summary: '一篇关于在熟悉的街道上慢慢走的示例随笔。',
    body: '平时经过那条路，总在看红绿灯。昨天没有赶时间，才发现街角那棵树已经掉了一半的叶子。\n\n我想下次可以把手机留在口袋里。那条路就那么短，也用不着一直知道还剩几分钟。',
    publishedAt: '2026-10-28T08:00:00.000+08:00',
  },
]

for (const { note, ...sample } of samples) {
  const firstBreak = sample.body.indexOf('\n\n')
  const body = note
    ? sample.body.slice(0, firstBreak) + '\n\n:::note\n' + note + '\n:::' + sample.body.slice(firstBreak)
    : sample.body
  const { docs: [latest] } = await payload.find({
    collection: 'articles', where: { slug: { equals: sample.slug } }, draft: true, limit: 1,
  })
  if (!latest) {
    await payload.create({ collection: 'articles', data: { ...sample, body, _status: 'published' } })
  } else if (
    note && latest._status === 'published' && latest.body === sample.body
    && latest.title === sample.title && latest.summary === sample.summary && latest.category === sample.category
  ) {
    await payload.update({
      collection: 'articles', id: latest.id, data: { body, _status: 'published' },
    })
  }
}

await payload.destroy()
