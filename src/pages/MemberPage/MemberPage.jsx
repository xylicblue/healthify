import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Activity, Droplets, Scale, Plus, ChevronRight, FlaskConical } from 'lucide-react'
import Navbar from '../../components/Navbar/Navbar'
import './MemberPage.css'
import { useEffect, useState } from 'react'
import { authFetch } from '../../lib/authFetch'

const API = 'http://localhost:5000'

const RECORD_ICONS = {
  BP:     { Icon: Activity,     color: 'text-red-400',    bg: 'bg-red-50'    },
  SUGAR:  { Icon: Droplets,     color: 'text-amber-400',  bg: 'bg-amber-50'  },
  WEIGHT: { Icon: Scale,        color: 'text-blue-400',   bg: 'bg-blue-50'   },
  LAB:    { Icon: FlaskConical, color: 'text-purple-400', bg: 'bg-purple-50' },
}

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return '—'
  const diff = Date.now() - new Date(dateOfBirth).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

function formatRecord(record) {
  if (record.recordType === 'BP') return `${record.value1}/${record.value2} mmHg`
  if (record.recordType === 'SUGAR') return `${record.value1} mg/dL`
  if (record.recordType === 'WEIGHT') return `${record.value1} kg`
  if (record.recordType === 'LAB') {
    const label = record.notes || 'Lab Report'
    return `${label} · ${record.value1} test${record.value1 !== 1 ? 's' : ''}`
  }
  return String(record.value1)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MemberPage() {
  const [member, setMember] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const { id } = useParams()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memberRes, recordRes] = await Promise.all([
          authFetch(`${API}/api/members/${id}`),
          authFetch(`${API}/api/members/${id}/records`),
        ])
        if (memberRes) setMember(await memberRes.json())
        if (recordRes) setRecords(await recordRes.json())
      } catch (err) {
        console.log(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading || !member) {
    return (
      <div className="member-page min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const age = calcAge(member.dateOfBirth)
  const recentRecords = records.slice(0, 5)
  const latestBP     = records.find((r) => r.recordType === 'BP')
  const latestSugar  = records.find((r) => r.recordType === 'SUGAR')
  const latestWeight = records.find((r) => r.recordType === 'WEIGHT')

  return (
    <div className="member-page min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Family
        </Link>

        {/* Member header card */}
        <div className="member-header-card bg-white rounded-2xl p-6 border border-slate-200 mb-6 animate-fade-up">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 flex-shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{member.name}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm text-slate-500">
                <span>{age} years old</span>
                <span className="text-slate-300">&bull;</span>
                <span>{member.gender}</span>
                <span className="text-slate-300">&bull;</span>
                <span>Born {formatDate(member.dateOfBirth)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Health stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-up delay-75">

          {/* Blood Pressure */}
          <div className="health-stat-card bg-white rounded-2xl p-5 border border-slate-200 card-lift">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm font-medium text-slate-600">Blood Pressure</span>
            </div>
            {latestBP ? (
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {latestBP.value1}/{latestBP.value2}
                <span className="text-sm font-normal text-slate-400 ml-1">mmHg</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400 mb-1">No data yet</p>
            )}
            <Link
              to={`/member/${id}/records?type=bp`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-3 font-medium"
            >
              View history <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Blood Sugar */}
          <div className="health-stat-card bg-white rounded-2xl p-5 border border-slate-200 card-lift">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Droplets className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-slate-600">Blood Sugar</span>
            </div>
            {latestSugar ? (
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {latestSugar.value1}
                <span className="text-sm font-normal text-slate-400 ml-1">mg/dL</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400 mb-1">No data yet</p>
            )}
            <Link
              to={`/member/${id}/records?type=sugar`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-3 font-medium"
            >
              View history <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Weight */}
          <div className="health-stat-card bg-white rounded-2xl p-5 border border-slate-200 card-lift">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-slate-600">Weight</span>
            </div>
            {latestWeight ? (
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {latestWeight.value1}
                <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400 mb-1">No data yet</p>
            )}
            <Link
              to={`/member/${id}/records?type=weight`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-3 font-medium"
            >
              View history <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recent records */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6 animate-fade-up delay-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Records</h2>
            <Link
              to={`/member/${id}/records`}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all &amp; charts <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRecords.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">No records yet</div>
            ) : (
              recentRecords.map((record) => {
                const iconData = RECORD_ICONS[record.recordType]
                if (!iconData) return null
                const { Icon, color, bg } = iconData
                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors duration-100"
                  >
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{formatRecord(record)}</p>
                      {record.notes && (
                        <p className="text-xs text-slate-400 truncate">{record.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(record.recordedAt)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Add record CTA */}
        <div className="flex justify-center animate-fade-up delay-225">
          <Link
            to={`/add-record?memberId=${id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all duration-200 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add New Record
          </Link>
        </div>
      </main>
    </div>
  )
}
