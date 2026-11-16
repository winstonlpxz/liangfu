import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cms } from '@/content'
import { getOwner } from './owner'
import { PasswordForm } from './PasswordForm'

export async function PasswordPage({ setup }: { setup: boolean }) {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  if (user) redirect('/admin')

  const owner = await getOwner(payload)
  if (owner && setup) redirect('/admin/login')
  if (!owner && !setup) redirect('/admin/create-first-user')

  return <PasswordForm setup={setup} />
}
