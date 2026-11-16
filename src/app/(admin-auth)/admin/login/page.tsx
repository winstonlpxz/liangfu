import { PasswordPage } from '@/admin/PasswordPage'

export const metadata = { title: '后台登录 · 良甫', robots: { index: false } }

export default function Page() {
  return <PasswordPage setup={false} />
}
