import { supabase } from './supabase'

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    window.location.replace('/login')
    return null
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (res.status === 401) {
    await supabase.auth.signOut()
    window.location.replace('/login')
    return null
  }

  return res
}
