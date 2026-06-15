import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Users, Hash, ArrowRight, Loader2, LogOut, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useFamily } from '../../context/FamilyContext'

const API = 'http://localhost:5000'

export default function SetupPage({ session }) {
  const navigate = useNavigate()
  const { setFamilyId } = useFamily()

  const [step, setStep] = useState('name')             // 'name' | 'family'
  const [memberName, setMemberName] = useState(
    session.user?.user_metadata?.full_name || ''
  )
  const [memberDob, setMemberDob] = useState('')
  const [memberGender, setMemberGender] = useState('')

  const savedCode = localStorage.getItem('healthify_invite_code') || ''
  const [tab, setTab] = useState(savedCode ? 'join' : 'create')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState(savedCode)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = session.access_token

  // If a code was pre-filled (from /join/:code link), fetch its preview automatically
  useEffect(() => {
    if (savedCode && step === 'family') handleCodeBlur()
  }, [step])

  function handleNameSubmit(e) {
    e.preventDefault()
    if (!memberName.trim()) return
    setStep('family')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/families`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: familyName, memberName: memberName.trim(), memberDob, memberGender }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setFamilyId(data.id)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCodeBlur() {
    if (inviteCode.length < 4) return
    setPreview(null)
    try {
      const res = await fetch(`${API}/api/families/invite/${inviteCode.toUpperCase()}`)
      if (res.ok) setPreview(await res.json())
    } catch {}
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/families/invite/${inviteCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberName: memberName.trim(), memberDob, memberGender }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      localStorage.removeItem('healthify_invite_code')
      setFamilyId(data.id)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 animate-fade-up">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold text-slate-900">Healthify</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm animate-fade-up delay-75">

        {/* Step 1 — Name */}
        {step === 'name' && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">What's your name?</h1>
            <p className="text-sm text-slate-500 mb-6">This is how you'll appear to your family members.</p>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Your name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Ahmed"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={memberDob}
                  onChange={(e) => setMemberDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Gender
                </label>
                <div className="flex gap-2">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setMemberGender(g)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
                        memberGender === g
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors duration-200"
              >
                <ArrowRight className="w-4 h-4" />
                Continue
              </button>
            </form>
          </>
        )}

        {/* Step 2 — Create or Join */}
        {step === 'family' && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Set up your family</h1>
            <p className="text-sm text-slate-500 mb-6">Create a family to get started, or join one with an invite code.</p>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                onClick={() => { setTab('create'); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${tab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Create Family
              </button>
              <button
                onClick={() => { setTab('join'); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${tab === 'join' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Join with Code
              </button>
            </div>

            {/* Create */}
            {tab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Family Name
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. The Al-Rashid Family"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Create Family
                </button>
              </form>
            )}

            {/* Join */}
            {tab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Invite Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. A1B2C3"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      onBlur={handleCodeBlur}
                      maxLength={8}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {preview && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-emerald-600 font-medium">Family found</p>
                      <p className="text-sm font-semibold text-emerald-800">{preview.name}</p>
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Join Family
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <button
        onClick={async () => { await supabase.auth.signOut(); setFamilyId(null); navigate('/login', { replace: true }) }}
        className="mt-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors duration-150"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  )
}
