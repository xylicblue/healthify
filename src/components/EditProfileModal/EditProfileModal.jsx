import { useState, useEffect } from 'react'
import { X, User, Loader2, CheckCircle } from 'lucide-react'
import { authFetch } from '../../lib/authFetch'
import { useFamily } from '../../context/FamilyContext'

const API = 'https://healthify-backend-production-0e90.up.railway.app'

export default function EditProfileModal({ onClose, onSaved }) {
  const { currentMember, setCurrentMember } = useFamily()

  const [name, setName]       = useState(currentMember?.name || '')
  const [dob, setDob]         = useState(
    currentMember?.dateOfBirth ? currentMember.dateOfBirth.slice(0, 10) : ''
  )
  const [gender, setGender]   = useState(currentMember?.gender || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), dateOfBirth: dob || null, gender: gender || null }),
      })
      if (!res) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setCurrentMember(data)
      setSaved(true)
      setTimeout(() => { onSaved?.(data); onClose() }, 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">Update how you appear to family members</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-900">Profile updated!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
              <div className="flex gap-2">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                      gender === g ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
