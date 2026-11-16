'use server'

import { createLocalReq, registerFirstUserOperation } from 'payload'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cms } from '@/content'
import { getOwner } from './owner'
import { isNewPassword, maximumPasswordLength, minimumPasswordLength } from './password'

const internalEmail = 'owner@liangfu.invalid'

async function establishSession(token: string, exp: number) {
  const { config } = await cms()
  const cookieStore = await cookies()
  cookieStore.set(config.cookiePrefix + '-token', token, {
    path: '/',
    expires: new Date(exp * 1000),
    httpOnly: true,
    sameSite: 'lax',
    secure: config.collections.find(({ slug }) => slug === 'users')?.auth.cookies.secure,
  })
}

export async function setupPassword(_previous: string, data: FormData) {
  const password = data.get('password')
  if (!isNewPassword(password)) {
    return '请输入 ' + minimumPasswordLength + ' 到 ' + maximumPasswordLength + ' 个字符的密码。'
  }
  if (password !== data.get('confirmation')) return '两次输入的密码不一致。'

  const payload = await cms()
  if (await getOwner(payload)) redirect('/admin/login')

  const req = await createLocalReq({}, payload)
  let result
  try {
    result = await registerFirstUserOperation({
      collection: payload.collections.users,
      data: { email: internalEmail, password },
      req,
    })
  } catch (error) {
    if (await getOwner(payload)) redirect('/admin/login')
    payload.logger.error({ errorType: error instanceof Error ? error.name : 'Unknown' }, '管理员初始化失败')
    return '初始化失败，请稍后重试。'
  }

  if (!result.token || !result.exp) redirect('/admin/login')
  await establishSession(result.token, result.exp)
  redirect('/admin')
}

export async function loginWithPassword(_previous: string, data: FormData) {
  const password = data.get('password')
  if (typeof password !== 'string' || !password || password.length > maximumPasswordLength) {
    return '请输入有效的密码。'
  }

  const payload = await cms()
  const owner = await getOwner(payload)
  if (!owner) redirect('/admin/create-first-user')

  let result
  try {
    result = await payload.login({ collection: 'users', data: { email: owner.email, password } })
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'Unknown'
    if (errorType === 'LockedAuth') return '尝试次数过多，请稍后再试。'
    if (errorType === 'AuthenticationError') return '密码不正确。'
    payload.logger.error({ errorType }, '管理员登录失败')
    return '暂时无法登录，请稍后重试。'
  }

  if (!result.token || !result.exp) return '暂时无法登录，请稍后重试。'
  await establishSession(result.token, result.exp)
  redirect('/admin')
}
