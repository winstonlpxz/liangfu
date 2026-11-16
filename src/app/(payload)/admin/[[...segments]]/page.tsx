import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import { redirect } from 'next/navigation'
import { importMap } from '../importMap.js'

type Props = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}

export function generateMetadata({ params, searchParams }: Props) {
  return generatePageMetadata({ config, params, searchParams })
}

export default async function Page({ params, searchParams }: Props) {
  const { segments } = await params
  const route = segments?.[0]

  if (route === 'forgot' || route === 'reset' || route === 'account' || route === 'verify') {
    redirect('/admin')
  }

  return RootPage({ config, params, searchParams, importMap })
}
