import { useState, useEffect, useRef } from 'react'
import { X, Mail, Send, CheckCircle, Loader2, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const API = 'https://healthify-backend-production-0e90.up.railway.app'
const APP_URL = 'http://localhost:5173'

export default function InviteModal({ inviteCode, onClose }) {
  const [method, setMethod] = useState('whatsapp')  // 'whatsapp' | 'email'

  // Email state
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  // WhatsApp state
  const [phone, setPhone] = useState('')

  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [method])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleEmail(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleWhatsApp(e) {
    e.preventDefault()
    const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '')
    const message = encodeURIComponent(
      `Hey! I'm inviting you to join our family on Healthify.\n\nClick this link to join: ${APP_URL}/join/${inviteCode}\n\n(You'll be asked to sign in with Google, then set your name — the code is filled in automatically.)`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
    onClose()
  }

  function switchMethod(m) {
    setMethod(m)
    setError('')
    setSent(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invite Family Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose how to send the invite</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
          <button
            onClick={() => switchMethod('whatsapp')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${method === 'whatsapp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Phone className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={() => switchMethod('email')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${method === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
        </div>

        {/* WhatsApp */}
        {method === 'whatsapp' && (
          <form onSubmit={handleWhatsApp} className="space-y-4">
            {inviteCode && (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Invite code</span>
                <span className="text-sm font-mono font-bold text-slate-800 tracking-widest">{inviteCode}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Include country code, e.g. +92 for Pakistan</p>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Open WhatsApp
            </button>
          </form>
        )}

        {/* Email */}
        {method === 'email' && (
          sent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">Invite sent!</p>
                <p className="text-sm text-slate-500 mt-0.5">{email}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Invite
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  )
}
