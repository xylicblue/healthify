import { useState, useEffect } from 'react'
import { X, Crown, Shield, Trash2, AlertTriangle, Loader2, ChevronRight } from 'lucide-react'
import { authFetch } from '../../lib/authFetch'
import { useFamily } from '../../context/FamilyContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const API = 'http://localhost:5000'

export default function FamilySettingsModal({ onClose }) {
  const { familyId, setFamilyId, currentMember, setCurrentMember } = useFamily()
  const navigate = useNavigate()

  const [members, setMembers]               = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [view, setView]                     = useState('main') // 'main' | 'transfer' | 'delete'
  const [selectedNewOwner, setSelectedNewOwner] = useState(null)
  const [busy, setBusy]                     = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    authFetch(`${API}/api/families/${familyId}/members`)
      .then((r) => r?.json())
      .then((data) => { if (data) setMembers(data) })
      .finally(() => setLoadingMembers(false))
  }, [familyId])

  const otherMembers = members.filter((m) => m.id !== currentMember?.id)

  async function handleTransfer() {
    if (!selectedNewOwner) return
    setError('')
    setBusy(true)
    try {
      const res = await authFetch(`${API}/api/families/${familyId}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerMemberId: selectedNewOwner }),
      })
      if (!res) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setCurrentMember((prev) => ({ ...prev, role: 'MEMBER' }))
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteFamily() {
    setError('')
    setBusy(true)
    try {
      const res = await authFetch(`${API}/api/families/${familyId}`, { method: 'DELETE' })
      if (!res) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setFamilyId(null)
      setCurrentMember(null)
      await supabase.auth.refreshSession()
      navigate('/setup', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Family Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Owner controls</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main view */}
        {view === 'main' && (
          <div className="p-4 space-y-2">
            <button
              onClick={() => { setView('transfer'); setError('') }}
              disabled={otherMembers.length === 0 && !loadingMembers}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">Transfer Ownership</p>
                  <p className="text-xs text-slate-400">Make someone else the owner</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => { setView('delete'); setError('') }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-red-700">Delete Family</p>
                  <p className="text-xs text-slate-400">Permanently delete all data</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        )}

        {/* Transfer ownership */}
        {view === 'transfer' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => { setView('main'); setError('') }} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Back</button>
              <h3 className="text-sm font-semibold text-slate-800">Choose new owner</h3>
            </div>

            {loadingMembers ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
            ) : otherMembers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">You're the only member — invite someone first.</p>
            ) : (
              <div className="space-y-1.5 mb-4">
                {otherMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedNewOwner(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      selectedNewOwner === m.id
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-700">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-800 flex-1 text-left">{m.name}</span>
                    {selectedNewOwner === m.id && <Crown className="w-4 h-4 text-amber-500" />}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleTransfer}
              disabled={!selectedNewOwner || busy}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Transfer Ownership
            </button>
          </div>
        )}

        {/* Delete family */}
        {view === 'delete' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => { setView('main'); setError('') }} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Back</button>
            </div>

            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900 mb-1">Delete entire family?</p>
                <p className="text-xs text-slate-500">This permanently deletes all members and their health records. There is no undo.</p>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setView('main')} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteFamily} disabled={busy} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
