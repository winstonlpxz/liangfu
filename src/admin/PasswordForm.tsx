'use client'

import { useActionState } from 'react'
import { loginWithPassword, setupPassword } from './actions'
import { maximumPasswordLength, minimumPasswordLength } from './password'
import styles from './password-form.module.css'

export function PasswordForm({ setup }: { setup: boolean }) {
  const [error, action, pending] = useActionState(setup ? setupPassword : loginWithPassword, '')

  return <main className={styles.center}>
    <form action={action} className={styles.form}>
      <a className={styles.brand} href="/">良甫</a>
      <h1>{setup ? '设置后台密码' : '管理后台登录'}</h1>
      <label htmlFor="admin-password">密码</label>
      <input
        id="admin-password"
        name="password"
        type="password"
        required
        autoComplete={setup ? 'new-password' : 'current-password'}
        minLength={setup ? minimumPasswordLength : undefined}
        maxLength={maximumPasswordLength}
        aria-describedby={setup ? 'password-length' : undefined}
      />
      {setup && <>
        <p className={styles.hint} id="password-length">至少 {minimumPasswordLength} 个字符。</p>
        <label htmlFor="admin-password-confirmation">确认密码</label>
        <input
          id="admin-password-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          maxLength={maximumPasswordLength}
        />
      </>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? '请稍候…' : setup ? '设置密码并登录' : '登录'}
      </button>
    </form>
  </main>
}
