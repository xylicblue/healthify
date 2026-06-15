import { Link } from 'react-router-dom'
import { Activity, Droplets, Scale, ChevronRight } from 'lucide-react'
import './MemberCard.css'

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
]

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return '—'
  const diff = Date.now() - new Date(dateOfBirth).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

function formatRelative(dateStr) {
  if (!dateStr) return 'never'
  const diff   = Date.now() - new Date(dateStr).getTime()
  const mins   = Math.floor(diff / 60_000)
  const hours  = Math.floor(diff / 3_600_000)
  const days   = Math.floor(diff / 86_400_000)
  const weeks  = Math.floor(days / 7)
  const months = Math.floor(days / 30.44)
  const years  = Math.floor(days / 365.25)
  if (mins < 1)    return 'just now'
  if (hours < 1)   return `${mins}m ago`
  if (days  < 1)   return `${hours}h ago`
  if (days  === 1) return 'yesterday'
  if (weeks < 2)   return `${days}d ago`
  if (months < 2)  return `${weeks}w ago`
  if (years < 2)   return `${months} months ago`
  return `${years} years ago`
}

export default function MemberCard({ member }) {
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const colorIndex = member.name.charCodeAt(0) % AVATAR_COLORS.length
  const avatarColor = AVATAR_COLORS[colorIndex]

  const records = member.records ?? []
  const latestBP     = records.find((r) => r.recordType === 'BP')
  const latestSugar  = records.find((r) => r.recordType === 'SUGAR')
  const latestWeight = records.find((r) => r.recordType === 'WEIGHT')
  const lastRecord   = records[0]

  return (
    <Link
      to={`/member/${member.id}`}
      className="member-card block bg-white rounded-2xl p-5 border border-slate-200 group card-lift"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-150 leading-tight">
              {member.name}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {calcAge(member.dateOfBirth)} yrs&nbsp;&bull;&nbsp;{member.gender}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors duration-150 mt-1 flex-shrink-0" />
      </div>

      {/* Health Indicators */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-slate-500">Blood Pressure</span>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {latestBP ? `${latestBP.value1}/${latestBP.value2} mmHg` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-500">Blood Sugar</span>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {latestSugar ? `${latestSugar.value1} mg/dL` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-500">Weight</span>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {latestWeight ? `${latestWeight.value1} kg` : '—'}
          </span>
        </div>
      </div>

      {/* Last Updated */}
      <p className="text-xs text-slate-400 mt-3">
        Updated {formatRelative(lastRecord?.recordedAt)}
      </p>
    </Link>
  )
}
