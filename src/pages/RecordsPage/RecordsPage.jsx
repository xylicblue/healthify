import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useParams } from 'react-router-dom'
import { ArrowLeft, Activity, Droplets, Scale, Plus, Trash2, ChevronDown, Pencil, FileDown, X, Loader2, FlaskConical } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import Navbar from '../../components/Navbar/Navbar'
import { authFetch } from '../../lib/authFetch'
import './RecordsPage.css'

const API = 'http://localhost:5000'

const TABS = [
  { id: 'bp',     label: 'Blood Pressure', Icon: Activity,     color: 'text-red-500',    activeBg: 'bg-red-50',    activeBorder: 'border-red-300'    },
  { id: 'sugar',  label: 'Blood Sugar',    Icon: Droplets,     color: 'text-amber-500',  activeBg: 'bg-amber-50',  activeBorder: 'border-amber-300'  },
  { id: 'weight', label: 'Weight',         Icon: Scale,        color: 'text-blue-500',   activeBg: 'bg-blue-50',   activeBorder: 'border-blue-300'   },
  { id: 'lab',    label: 'Lab Results',    Icon: FlaskConical, color: 'text-purple-500', activeBg: 'bg-purple-50', activeBorder: 'border-purple-300' },
]

const STATUS_STYLE = {
  normal:  { text: 'text-emerald-700', bg: 'bg-emerald-50'  },
  high:    { text: 'text-red-700',     bg: 'bg-red-50'      },
  low:     { text: 'text-blue-700',    bg: 'bg-blue-50'     },
  unknown: { text: 'text-slate-500',   bg: 'bg-slate-100'   },
}

const QUICK_RANGES  = ['1D', '3D', '1W', '1M']
const CUSTOM_RANGES = ['6M', '1Y']
const RANGE_DAYS    = { '1D': 1, '3D': 3, '1W': 7, '1M': 30, '6M': 180, '1Y': 365 }

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return '—'
  const diff = Date.now() - new Date(dateOfBirth).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Lab Detail Modal ───────────────────────────────────────────────────────────
function LabDetailModal({ record, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  let lab = { results: [], labName: null, testDate: null }
  try { lab = JSON.parse(record.labData || '{}') } catch {}

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Lab Results</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatDate(record.recordedAt)}
              {lab.labName && <> · {lab.labName}</>}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Test</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Range</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lab.results?.map((r, i) => {
                const s = STATUS_STYLE[r.status] || STATUS_STYLE.unknown
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-5 py-2.5 font-bold text-slate-900">{r.value} <span className="font-normal text-slate-400 text-xs">{r.unit}</span></td>
                    <td className="px-5 py-2.5 text-slate-400 text-xs">{r.referenceRange || '—'}</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${s.text} ${s.bg}`}>
                        {r.status === 'unknown' ? '—' : r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Edit Record Modal ──────────────────────────────────────────────────────────
function EditRecordModal({ record, memberId, onClose, onSaved }) {
  const [v1, setV1]     = useState(String(record.value1))
  const [v2, setV2]     = useState(record.value2 != null ? String(record.value2) : '')
  const [notes, setNotes] = useState(record.notes || '')
  const [dt, setDt]     = useState(new Date(record.recordedAt).toISOString().slice(0, 16))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = { value1: Number(v1), notes, recordedAt: dt }
      if (record.recordType === 'BP') body.value2 = Number(v2)
      const res = await authFetch(`${API}/api/members/${memberId}/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const label1 = record.recordType === 'BP' ? 'Systolic (mmHg)' : record.recordType === 'SUGAR' ? 'Blood Sugar (mg/dL)' : 'Weight (kg)'
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Edit Record</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label1}</label>
            <input type="number" step="any" value={v1} onChange={(e) => setV1(e.target.value)} className={inputCls} required />
          </div>

          {record.recordType === 'BP' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Diastolic (mmHg)</label>
              <input type="number" step="any" value={v2} onChange={(e) => setV2(e.target.value)} className={inputCls} required />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date &amp; Time</label>
            <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className={inputCls} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PDF export ─────────────────────────────────────────────────────────────────
async function exportPDF(memberName, records) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.text('Health Records', 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text(`${memberName}  •  Exported ${now}`, 14, 28)

  const sections = [
    {
      title: 'Blood Pressure',
      rows: records.filter((r) => r.recordType === 'BP'),
      head: [['Date', 'Time', 'Systolic (mmHg)', 'Diastolic (mmHg)', 'Notes']],
      body: (r) => [formatDate(r.recordedAt), formatTime(r.recordedAt), r.value1, r.value2, r.notes || ''],
    },
    {
      title: 'Blood Sugar',
      rows: records.filter((r) => r.recordType === 'SUGAR'),
      head: [['Date', 'Time', 'Blood Sugar (mg/dL)', 'Notes']],
      body: (r) => [formatDate(r.recordedAt), formatTime(r.recordedAt), r.value1, r.notes || ''],
    },
    {
      title: 'Weight',
      rows: records.filter((r) => r.recordType === 'WEIGHT'),
      head: [['Date', 'Time', 'Weight (kg)', 'Notes']],
      body: (r) => [formatDate(r.recordedAt), formatTime(r.recordedAt), r.value1, r.notes || ''],
    },
  ]

  let y = 36
  for (const section of sections) {
    if (section.rows.length === 0) continue
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.text(section.title, 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: section.head,
      body: section.rows.map(section.body),
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      styles: { cellPadding: 3 },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  doc.save(`${memberName.replace(/\s+/g, '_')}_health_records.pdf`)
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function RecordsPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab]           = useState(searchParams.get('type') || 'bp')
  const [activeDateRange, setActiveDateRange] = useState('1M')
  const [customOpen, setCustomOpen]         = useState(false)
  const customRef = useRef(null)

  const [memberData, setMemberData] = useState(null)
  const [recordsData, setRecords]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [editingRecord, setEditingRecord] = useState(null)
  const [viewingLab,   setViewingLab]   = useState(null)
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if (customRef.current && !customRef.current.contains(e.target)) setCustomOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const [memberRes, recordRes] = await Promise.all([
          authFetch(`${API}/api/members/${id}`),
          authFetch(`${API}/api/members/${id}/records`),
        ])
        if (memberRes) setMemberData(await memberRes.json())
        if (recordRes) setRecords(await recordRes.json())
      } catch (err) {
        console.log(err)
      } finally {
        setLoading(false)
      }
    }
    fetchMemberData()
  }, [id])

  if (loading || !memberData) {
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

  const memberName = memberData.name

  function filterByRange(records) {
    const cutoff = Date.now() - RANGE_DAYS[activeDateRange] * 24 * 60 * 60 * 1000
    return records.filter((r) => new Date(r.recordedAt).getTime() >= cutoff)
  }

  const bpRecords     = recordsData.filter((r) => r.recordType === 'BP')
  const sugarRecords  = recordsData.filter((r) => r.recordType === 'SUGAR')
  const weightRecords = recordsData.filter((r) => r.recordType === 'WEIGHT')
  const labRecords    = recordsData.filter((r) => r.recordType === 'LAB')

  const bpChart     = filterByRange(bpRecords).reverse().map((r) => ({ date: formatShortDate(r.recordedAt), Systolic: r.value1, Diastolic: r.value2 }))
  const sugarChart  = filterByRange(sugarRecords).reverse().map((r) => ({ date: formatShortDate(r.recordedAt), Sugar: r.value1 }))
  const weightChart = filterByRange(weightRecords).reverse().map((r) => ({ date: formatShortDate(r.recordedAt), Weight: r.value1 }))

  async function handleDeleteRecord(recordId) {
    setRecords((prev) => prev.filter((r) => r.id !== recordId))
    await authFetch(`${API}/api/members/${id}/records/${recordId}`, { method: 'DELETE' })
  }

  function handleRecordSaved(updated) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  async function handleExportPDF() {
    setExportBusy(true)
    try {
      await exportPDF(memberName, recordsData)
    } finally {
      setExportBusy(false)
    }
  }

  const activeTabConfig = TABS.find((t) => t.id === activeTab)
  const thClass = 'px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider'
  const tdClass = 'px-6 py-3.5'

  // Row actions cell shared renderer
  function RowActions({ record }) {
    return (
      <td className={tdClass}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => setEditingRecord(record)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteRecord(record.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    )
  }

  return (
    <div className="records-page min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back */}
        <Link
          to={`/member/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {memberName}'s Profile
        </Link>

        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <h1 className="text-2xl font-bold text-slate-900">Health Records</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={exportBusy || recordsData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exportBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <Link
              to={`/add-record?memberId=${id}&type=${activeTab}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Record</span>
            </Link>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1.5 mb-6 p-1 bg-white rounded-xl border border-slate-200 w-fit animate-fade-up delay-75">
          {TABS.map(({ id: tabId, label, Icon, color, activeBg, activeBorder }) => {
            const isActive = activeTab === tabId
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                  isActive ? `${activeBg} ${color} ${activeBorder}` : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Chart — hidden for lab tab */}
        {activeTab !== 'lab' && <div className="chart-section bg-white rounded-2xl border border-slate-200 p-6 mb-6 animate-fade-up delay-75">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Trend</h2>
            <div className="flex gap-1 items-center">
              {QUICK_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveDateRange(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors duration-150 ${
                    activeDateRange === r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}

              <div className="relative" ref={customRef}>
                <button
                  onClick={() => setCustomOpen((o) => !o)}
                  className={`flex items-center gap-0.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors duration-150 ${
                    CUSTOM_RANGES.includes(activeDateRange) ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {CUSTOM_RANGES.includes(activeDateRange) ? activeDateRange : 'More'}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${customOpen ? 'rotate-180' : ''}`} />
                </button>

                {customOpen && (
                  <div className="absolute right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-10 min-w-[72px]">
                    {CUSTOM_RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={() => { setActiveDateRange(r); setCustomOpen(false) }}
                        className={`w-full text-left text-xs px-3 py-1.5 font-medium transition-colors duration-150 ${
                          activeDateRange === r ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'bp' && (
            bpChart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200">
                <p className="text-sm text-slate-400">Not enough data to show a trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={bpChart} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="Systolic"  stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Diastolic" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}

          {activeTab === 'sugar' && (
            sugarChart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200">
                <p className="text-sm text-slate-400">Not enough data to show a trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sugarChart} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit=" mg/dL" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => [`${v} mg/dL`, 'Blood Sugar']} />
                  <Line type="monotone" dataKey="Sugar" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}

          {activeTab === 'weight' && (
            weightChart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200">
                <p className="text-sm text-slate-400">Not enough data to show a trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightChart} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit=" kg" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => [`${v} kg`, 'Weight']} />
                  <Line type="monotone" dataKey="Weight" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}
        </div>}

        {/* Records table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-fade-up delay-150">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">{activeTabConfig?.label} History</h2>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'bp' && (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Systolic</th>
                    <th className={thClass}>Diastolic</th>
                    <th className={thClass}>Notes</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bpRecords.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No blood pressure records yet</td></tr>
                  ) : bpRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors duration-100 group">
                      <td className={tdClass}>
                        <p className="text-sm font-medium text-slate-900">{formatDate(r.recordedAt)}</p>
                        <p className="text-xs text-slate-400">{formatTime(r.recordedAt)}</p>
                      </td>
                      <td className={tdClass}><span className="text-sm font-bold text-slate-900">{r.value1}</span><span className="text-xs text-slate-400 ml-1">mmHg</span></td>
                      <td className={tdClass}><span className="text-sm font-bold text-slate-900">{r.value2}</span><span className="text-xs text-slate-400 ml-1">mmHg</span></td>
                      <td className={`${tdClass} text-sm text-slate-500`}>{r.notes || '—'}</td>
                      <RowActions record={r} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'sugar' && (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Blood Sugar</th>
                    <th className={thClass}>Notes</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sugarRecords.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">No blood sugar records yet</td></tr>
                  ) : sugarRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors duration-100 group">
                      <td className={tdClass}>
                        <p className="text-sm font-medium text-slate-900">{formatDate(r.recordedAt)}</p>
                        <p className="text-xs text-slate-400">{formatTime(r.recordedAt)}</p>
                      </td>
                      <td className={tdClass}><span className="text-sm font-bold text-slate-900">{r.value1}</span><span className="text-xs text-slate-400 ml-1">mg/dL</span></td>
                      <td className={`${tdClass} text-sm text-slate-500`}>{r.notes || '—'}</td>
                      <RowActions record={r} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'weight' && (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Weight</th>
                    <th className={thClass}>Notes</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weightRecords.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">No weight records yet</td></tr>
                  ) : weightRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors duration-100 group">
                      <td className={tdClass}>
                        <p className="text-sm font-medium text-slate-900">{formatDate(r.recordedAt)}</p>
                        <p className="text-xs text-slate-400">{formatTime(r.recordedAt)}</p>
                      </td>
                      <td className={tdClass}><span className="text-sm font-bold text-slate-900">{r.value1}</span><span className="text-xs text-slate-400 ml-1">kg</span></td>
                      <td className={`${tdClass} text-sm text-slate-500`}>{r.notes || '—'}</td>
                      <RowActions record={r} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'lab' && (
              labRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-purple-300" />
                  </div>
                  <p className="text-sm text-slate-400">No lab reports uploaded yet</p>
                  <Link
                    to={`/add-record?memberId=${id}&type=lab`}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Upload a blood test report →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {labRecords.map((r) => {
                    let lab = { results: [], labName: null }
                    try { lab = JSON.parse(r.labData || '{}') } catch {}
                    const abnormal = lab.results?.filter((x) => x.status === 'high' || x.status === 'low').length || 0
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FlaskConical className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-900">{lab.labName || 'Lab Report'}</p>
                            {abnormal > 0 && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                                {abnormal} abnormal
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {formatDate(r.recordedAt)} · {lab.results?.length || 0} tests
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewingLab(r)}
                            className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            View all
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          memberId={id}
          onClose={() => setEditingRecord(null)}
          onSaved={handleRecordSaved}
        />
      )}

      {viewingLab && (
        <LabDetailModal record={viewingLab} onClose={() => setViewingLab(null)} />
      )}
    </div>
  )
}
