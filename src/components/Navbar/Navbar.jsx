import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, ChevronDown, LogOut, UserX, UserCog, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { authFetch } from '../../lib/authFetch'
import './Navbar.css'
import { useFamily } from '../../context/FamilyContext'
import EditProfileModal from '../EditProfileModal/EditProfileModal'
import FamilySettingsModal from '../FamilySettingsModal/FamilySettingsModal'

const API = 'https://healthify-backend-production-0e90.up.railway.app'

export default function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { familyId, setFamilyId, currentMember, setCurrentMember } = useFamily()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaveError, setLeaveError] = useState('')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showFamilySettings, setShowFamilySettings] = useState(false)

  const [familyData, setFamData] = useState(null)
  useEffect(() => {
    if (!familyId) return
    authFetch(`${API}/api/families/${familyId}`)
      .then((r) => r?.json())
      .then((data) => { if (data) setFamData(data) })
      .catch(() => {})
  }, [familyId])
  const familyName = familyData?.name

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setConfirmLeave(false)
        setLeaveError('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const handleLeaveFamily = async () => {
    setLeaveError('')
    const res = await authFetch(`${API}/api/auth/family`, { method: 'DELETE' })
    if (!res) return
    const data = await res.json()
    if (!res.ok) {
      setLeaveError(data.message || 'Could not leave family')
      return
    }
    setFamilyId(null)
    setCurrentMember(null)
    navigate('/setup', { replace: true })
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? ''
  const firstName   = displayName.split(' ')[0]
  const avatarUrl   = user?.user_metadata?.avatar_url
  const initials    = displayName.slice(0, 2).toUpperCase() || '?'

  const isOwner = currentMember?.role === 'OWNER'

  return (
    <>
      <nav className="navbar bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold text-slate-900">Healthify</span>
            </Link>

            {/* Family name */}
            <span className="hidden md:block text-sm font-medium text-slate-500">
              {familyName}
            </span>

            {/* User menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { setDropdownOpen((o) => !o); setConfirmLeave(false); setLeaveError('') }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors duration-150"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-700">{initials}</span>
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {firstName}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="navbar-dropdown absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">{currentMember?.name || displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    {isOwner && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Owner
                      </span>
                    )}
                  </div>

                  {/* Edit Profile */}
                  <button
                    onClick={() => { setShowEditProfile(true); setDropdownOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-150"
                  >
                    <UserCog className="w-4 h-4" />
                    Edit Profile
                  </button>

                  {/* Owner: Family Settings | Member: Leave Family */}
                  {isOwner ? (
                    <button
                      onClick={() => { setShowFamilySettings(true); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-150"
                    >
                      <Settings className="w-4 h-4" />
                      Family Settings
                    </button>
                  ) : !confirmLeave ? (
                    <button
                      onClick={() => setConfirmLeave(true)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-150"
                    >
                      <UserX className="w-4 h-4" />
                      Leave Family
                    </button>
                  ) : (
                    <div className="px-4 py-3 border-t border-slate-100">
                      <p className="text-xs text-slate-600 mb-1">This removes you and your health records from the family.</p>
                      {leaveError && <p className="text-xs text-red-500 mb-1">{leaveError}</p>}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setConfirmLeave(false); setLeaveError('') }}
                          className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleLeaveFamily}
                          className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}

      {showFamilySettings && (
        <FamilySettingsModal onClose={() => setShowFamilySettings(false)} />
      )}
    </>
  )
}
