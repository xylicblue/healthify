import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './AuthCallbackPage.css'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase automatically exchanges the ?code= param from Google for a session.
    // We just listen for the result and redirect accordingly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true })
      }
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
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
