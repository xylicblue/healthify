import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from './lib/supabase'
import { FamilyProvider, useFamily } from './context/FamilyContext'
import LoginPage from './pages/LoginPage/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage/AuthCallbackPage'
import DashboardPage from './pages/DashboardPage/DashboardPage'
import MemberPage from './pages/MemberPage/MemberPage'
import RecordsPage from './pages/RecordsPage/RecordsPage'
import AddRecordPage from './pages/AddRecordPage/AddRecordPage'
import SetupPage from './pages/SetupPage/SetupPage'
import './App.css'

const API = 'https://healthify-backend-production-0e90.up.railway.app'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
        <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div
        style={{
          width: 24, height: 24,
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const INVITE_CODE_KEY = 'healthify_invite_code'

function JoinByCode({ session, familyId }) {
  const { code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem(INVITE_CODE_KEY, code)
    if (!session) navigate('/login', { replace: true })
    else if (!familyId) navigate('/setup', { replace: true })
    else navigate('/dashboard', { replace: true })
  }, [code, session, familyId])

  return <LoadingScreen />
}

// Redirects to /login if no session, to /setup if no family
function ProtectedRoute({ session, children }) {
  const { familyId } = useFamily()
  if (session === null) return <Navigate to="/login" replace />
  if (familyId === null) return <Navigate to="/setup" replace />
  return children
}

function AppRoutes({ session }) {
  const { familyId, setFamilyId, setCurrentMember } = useFamily()

  useEffect(() => {
    if (session === undefined) return
    if (session === null) {
      setFamilyId(null)
      setCurrentMember(null)
      return
    }
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        setFamilyId(data.family?.id ?? null)
        setCurrentMember(data.member ?? null)
      })
      .catch(() => {})
  }, [session])

  // Still checking: session unknown, or session exists but familyId not yet determined
  if (session === undefined || (session && familyId === undefined)) return <LoadingScreen />

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={session ? '/dashboard' : '/login'} replace />}
      />

      {/* Public */}
      <Route path="/join/:code" element={<JoinByCode session={session} familyId={familyId} />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/setup"
        element={
          !session ? <Navigate to="/login" replace /> :
          familyId ? <Navigate to="/dashboard" replace /> :
          <SetupPage session={session} />
        }
      />

      {/* Protected */}
      <Route path="/dashboard" element={
        <ProtectedRoute session={session}><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/member/:id" element={
        <ProtectedRoute session={session}><MemberPage /></ProtectedRoute>
      } />
      <Route path="/member/:id/records" element={
        <ProtectedRoute session={session}><RecordsPage /></ProtectedRoute>
      } />
      <Route path="/add-record" element={
        <ProtectedRoute session={session}><AddRecordPage /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <FamilyProvider>
        <AppRoutes session={session} />
      </FamilyProvider>
    </BrowserRouter>
  )
}

export default App
