import { Buffer } from 'node:buffer'
import { getPayload } from 'payload'
import config from '../payload.config'
import { isNewPassword, maximumPasswordLength, minimumPasswordLength } from './password'
import { getOwner } from './owner'

const chunks: Buffer[] = []
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
const password = Buffer.concat(chunks).toString('utf8')

if (!isNewPassword(password)) {
  console.error('请输入 ' + minimumPasswordLength + ' 到 ' + maximumPasswordLength + ' 个字符的密码。')
  process.exitCode = 1
} else {
  const payload = await getPayload({ config })
  try {
    const owner = await getOwner(payload)
    if (!owner) {
      console.error('管理员尚未设置，请先访问 /admin。')
      process.exitCode = 1
    } else {
      await payload.update({
        collection: 'users',
        id: owner.id,
        data: { password, sessions: [], loginAttempts: 0, lockUntil: null },
        overrideAccess: true,
      })
      console.log('后台密码已重置，现有登录已退出。')
    }
  } finally {
    await payload.destroy()
  }
}
