import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'th'
  const validLocale = ['th', 'en'].includes(locale) ? locale : 'th'

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default as Record<string, unknown>,
  }
})
