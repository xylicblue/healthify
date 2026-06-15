import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './AuthCallbackPage.css'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let done = false

    function go(session) {
      if (done) return
      done = true
      navigate(session ? '/dashboard' : '/login', { replace: true })
    }

    // Primary: event listener — SIGNED_IN for normal flow,
    // INITIAL_SESSION catches the case where exchange completed before this listener registered
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) go(session)
      if (event === 'SIGNED_OUT') go(null)
    })

    // Fallback A: immediate session check (handles Safari where INITIAL_SESSION may not reflect
    // a just-exchanged code that finished before the listener above was set up)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) go(session)
    })

    // Fallback B: retry after 2.5s for slow devices / Safari ITP delays
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => go(session))
    }, 2500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [navigate])

  return (
    <div className="callback-page min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center pulse-logo">
        <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <p className="text-slate-500 text-sm font-medium">Signing you in…</p>
      <div className="spinner" />
    </div>
  )
}
