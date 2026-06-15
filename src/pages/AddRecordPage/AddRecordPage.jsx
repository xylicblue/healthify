import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useFamily } from "../../context/FamilyContext";
import {
  ArrowLeft, Activity, Droplets, Scale, Save, CheckCircle,
  FlaskConical, Upload, Sparkles, Loader2, X, Plus, Trash2, FileText,
} from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import { authFetch } from "../../lib/authFetch";
import "./AddRecordPage.css";

const API = "http://localhost:5000";

const RECORD_TYPES = [
  { id: "bp",    label: "Blood Pressure", Icon: Activity,     color: "text-red-500",    bg: "bg-red-50",    activeBorder: "border-red-400",    activeBg: "bg-red-50"    },
  { id: "sugar", label: "Blood Sugar",    Icon: Droplets,     color: "text-amber-500",  bg: "bg-amber-50",  activeBorder: "border-amber-400",  activeBg: "bg-amber-50"  },
  { id: "weight",label: "Weight",         Icon: Scale,        color: "text-blue-500",   bg: "bg-blue-50",   activeBorder: "border-blue-400",   activeBg: "bg-blue-50"   },
  { id: "lab",   label: "Blood Test",     Icon: FlaskConical, color: "text-purple-500", bg: "bg-purple-50", activeBorder: "border-purple-400", activeBg: "bg-purple-50" },
];

const SUGAR_CONTEXTS = [
  { id: "fasting",    label: "Fasting"     },
  { id: "before_meal",label: "Before meal" },
  { id: "after_meal", label: "After meal"  },
  { id: "random",     label: "Random"      },
];

const STATUS_STYLE = {
  normal:  { text: "text-emerald-700", bg: "bg-emerald-50",  label: "Normal"  },
  high:    { text: "text-red-700",     bg: "bg-red-50",      label: "High"    },
  low:     { text: "text-blue-700",    bg: "bg-blue-50",     label: "Low"     },
  unknown: { text: "text-slate-500",   bg: "bg-slate-100",   label: "—"       },
};

const now = () => new Date().toISOString().slice(0, 16);

export default function AddRecordPage() {
  const navigate   = useNavigate();
  const { familyId } = useFamily();
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!familyId) return;
    authFetch(`${API}/api/families/${familyId}/members`)
      .then((r) => r?.json())
      .then((data) => { if (data) setMembers(data) })
      .catch(console.log);
  }, [familyId]);

  const [selectedMember, setSelectedMember] = useState(searchParams.get("memberId") || "");
  const [recordType,     setRecordType]     = useState(searchParams.get("type") || "bp");
  const [dateTime,       setDateTime]       = useState(now);

  // BP
  const [systolic,  setSystolic]  = useState("");
  const [diastolic, setDiastolic] = useState("");

  // Sugar
  const [sugarValue,   setSugarValue]   = useState("");
  const [sugarContext, setSugarContext] = useState("fasting");

  // Weight
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit,  setWeightUnit]  = useState("kg");

  // Lab
  const [labFile,       setLabFile]       = useState(null);
  const [extracting,    setExtracting]    = useState(false);
  const [labResults,    setLabResults]    = useState(null); // null = not yet extracted
  const [labMeta,       setLabMeta]       = useState({ testDate: null, labName: null });
  const [extractError,  setExtractError]  = useState("");
  const [dragging,      setDragging]      = useState(false);
  const fileInputRef = useRef(null);

  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  // ── Lab file handlers ─────────────────────────────────────────────────────
  function handleFileSelect(file) {
    if (!file) return;
    const ok = ['image/jpeg','image/png','image/webp'].includes(file.type);
    if (!ok) { setExtractError('Unsupported file type. Use JPG, PNG, or WebP. For PDFs, take a clear photo instead.'); return; }
    if (file.size > 10 * 1024 * 1024) { setExtractError('File too large (max 10 MB).'); return; }
    setLabFile(file);
    setLabResults(null);
    setExtractError('');
  }

  async function handleExtract() {
    if (!labFile || !selectedMember) return;
    setExtracting(true);
    setExtractError('');
    try {
      const formData = new FormData();
      formData.append('report', labFile);
      const res = await authFetch(`${API}/api/members/${selectedMember}/records/extract`, {
        method: 'POST',
        body: formData,
      });
      if (!res) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLabResults(data.results || []);
      setLabMeta({ testDate: data.testDate, labName: data.labName });
      if (data.testDate) setDateTime(data.testDate + 'T00:00');
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  function updateLabResult(idx, field, val) {
    setLabResults((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: field === 'value' ? Number(val) : val } : r));
  }

  function removeLabResult(idx) {
    setLabResults((prev) => prev.filter((_, i) => i !== idx));
  }

  function addLabResult() {
    setLabResults((prev) => [...prev, { name: '', value: 0, unit: '', referenceRange: null, status: 'unknown' }]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload;

    if (recordType === "bp") {
      payload = { recordType: "BP", value1: Number(systolic), value2: Number(diastolic), notes, recordedAt: dateTime };
    } else if (recordType === "sugar") {
      payload = { recordType: "SUGAR", value1: Number(sugarValue), notes, recordedAt: dateTime };
    } else if (recordType === "weight") {
      payload = { recordType: "WEIGHT", value1: Number(weightValue), notes, recordedAt: dateTime };
    } else {
      // LAB
      payload = {
        recordType: "LAB",
        value1: labResults.length,
        notes: labMeta.labName || notes || '',
        labData: JSON.stringify({ results: labResults, testDate: labMeta.testDate, labName: labMeta.labName }),
        recordedAt: dateTime,
      };
    }

    try {
      const res = await authFetch(`${API}/api/members/${selectedMember}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res) return;
      if (res.ok) {
        setSaved(true);
        setTimeout(() => navigate(selectedMember ? `/member/${selectedMember}` : "/dashboard"), 1500);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  const canSubmit = recordType !== 'lab' || (labResults && labResults.length > 0);

  return (
    <div className="add-record-page min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={selectedMember ? `/member/${selectedMember}` : "/dashboard"}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6 animate-fade-up">Add Health Record</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Member selector */}
          <div className="form-card bg-white rounded-2xl border border-slate-200 p-6 animate-fade-up delay-75">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Family Member</h2>
            <div>
              <label className={labelClass}>Select Member</label>
              <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className={`${inputClass} cursor-pointer`} required>
                <option value="" disabled>Choose a family member…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Record type */}
          <div className="form-card bg-white rounded-2xl border border-slate-200 p-6 animate-fade-up delay-150">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Record Type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RECORD_TYPES.map(({ id, label, Icon, color, bg, activeBorder, activeBg }) => {
                const isActive = recordType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setRecordType(id); setLabResults(null); setLabFile(null); setExtractError(''); }}
                    className={`type-btn flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isActive ? `${activeBg} ${activeBorder} shadow-sm` : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${isActive ? "bg-white" : bg} flex items-center justify-center transition-colors`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <span className={`text-xs font-semibold text-center leading-tight ${isActive ? color : "text-slate-600"}`}>
                      {label}
                    </span>
                    {id === 'lab' && (
                      <span className="text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full -mt-1">AI</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Measurement — BP / Sugar / Weight */}
          {recordType !== 'lab' && (
            <div className="form-card bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Measurement</h2>

              {recordType === "bp" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Systolic <span className="text-slate-400 font-normal">(mmHg)</span></label>
                    <input type="number" min="60" max="250" placeholder="e.g. 128" value={systolic} onChange={(e) => setSystolic(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Diastolic <span className="text-slate-400 font-normal">(mmHg)</span></label>
                    <input type="number" min="40" max="180" placeholder="e.g. 84" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} className={inputClass} required />
                  </div>
                </div>
              )}

              {recordType === "sugar" && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Blood Sugar Level <span className="text-slate-400 font-normal">(mg/dL)</span></label>
                    <input type="number" min="20" max="600" placeholder="e.g. 120" value={sugarValue} onChange={(e) => setSugarValue(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Context</label>
                    <div className="flex flex-wrap gap-3">
                      {SUGAR_CONTEXTS.map(({ id, label }) => (
                        <label key={id} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="sugarContext" value={id} checked={sugarContext === id} onChange={() => setSugarContext(id)} className="accent-amber-500 w-4 h-4" />
                          <span className="text-sm text-slate-600">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {recordType === "weight" && (
                <div>
                  <label className={labelClass}>Body Weight</label>
                  <div className="flex gap-2">
                    <input type="number" min="10" max="500" step="0.1" placeholder="e.g. 87.5" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className={`${inputClass} flex-1`} required />
                    <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lab upload + extraction */}
          {recordType === 'lab' && (
            <div className="form-card bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">Upload Lab Report</h2>
                <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> AI Extraction
                </span>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]) }}
                className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  dragging ? 'border-purple-400 bg-purple-50' :
                  labFile  ? 'border-emerald-300 bg-emerald-50' :
                             'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                {labFile ? (
                  <>
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-800">{labFile.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{(labFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLabFile(null); setLabResults(null); setExtractError('') }}
                      className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">Drop file here or click to browse</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP · max 10 MB</p>
                    </div>
                  </>
                )}
              </div>

              {/* Extract button */}
              {labFile && !labResults && (
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || !selectedMember}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {extracting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Extracting with AI…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Extract with AI</>
                  )}
                </button>
              )}
              {!selectedMember && labFile && !labResults && (
                <p className="text-xs text-amber-600 text-center -mt-2">Select a family member above first</p>
              )}

              {extractError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm text-red-600">{extractError}</p>
                </div>
              )}

              {/* Extracted results table */}
              {labResults && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">
                      {labResults.length} test{labResults.length !== 1 ? 's' : ''} found
                      {labMeta.labName && <span className="font-normal text-slate-400"> · {labMeta.labName}</span>}
                    </p>
                    <button type="button" onClick={addLabResult} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Plus className="w-3.5 h-3.5" /> Add row
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs min-w-[420px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[38%]">Test</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[16%]">Value</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[16%]">Unit</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[20%]">Status</th>
                          <th className="px-3 py-2 w-[10%]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {labResults.map((r, i) => {
                          const s = STATUS_STYLE[r.status] || STATUS_STYLE.unknown;
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={r.name}
                                  onChange={(e) => updateLabResult(i, 'name', e.target.value)}
                                  className="w-full bg-transparent text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={r.value}
                                  onChange={(e) => updateLabResult(i, 'value', e.target.value)}
                                  className="w-full bg-transparent text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={r.unit}
                                  onChange={(e) => updateLabResult(i, 'unit', e.target.value)}
                                  className="w-full bg-transparent text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <select
                                  value={r.status}
                                  onChange={(e) => updateLabResult(i, 'status', e.target.value)}
                                  className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 focus:outline-none cursor-pointer ${s.text} ${s.bg}`}
                                >
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                  <option value="low">Low</option>
                                  <option value="unknown">—</option>
                                </select>
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                <button type="button" onClick={() => removeLabResult(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date, time, notes */}
          <div className="form-card bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Details</h2>
            <div>
              <label className={labelClass}>Date &amp; Time</label>
              <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className={inputClass} required />
            </div>
            {recordType !== 'lab' && (
              <div>
                <label className={labelClass}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="Any additional context about this reading…" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {recordType === 'lab' && !labResults ? 'Extract results first' : 'Save Record'}
          </button>
        </form>
      </main>

      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg animate-fade-in-up z-50">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">Record saved successfully!</span>
        </div>
      )}
    </div>
  );
}
