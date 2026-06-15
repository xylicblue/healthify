import { Link } from "react-router-dom";
import { Plus, Users, UserPlus, TrendingUp, Calendar, Settings } from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import MemberCard from "../../components/MemberCard/MemberCard";
import "./DashboardPage.css";
import { useState, useEffect } from "react";
import { useFamily } from "../../context/FamilyContext";
import { authFetch } from "../../lib/authFetch";
import InviteModal from "../../components/InviteModal/InviteModal";
import FamilySettingsModal from "../../components/FamilySettingsModal/FamilySettingsModal";

function MemberCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
        <div className="skeleton w-4 h-4 rounded mt-1" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-14" />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-12" />
        </div>
      </div>
      <div className="skeleton h-3 w-24 mt-3" />
    </div>
  )
}

const API = "https://healthify-backend-production-0e90.up.railway.app";

export default function DashboardPage() {
  const { familyId, currentMember } = useFamily();
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showFamilySettings, setShowFamilySettings] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    const fetchData = async () => {
      try {
        const [familyRes, membersRes] = await Promise.all([
          authFetch(`${API}/api/families/${familyId}`),
          authFetch(`${API}/api/families/${familyId}/members`),
        ]);
        if (familyRes) {
          const family = await familyRes.json();
          setFamilyName(family.name);
          setInviteCode(family.inviteCode || "");
        }
        if (membersRes) setMembers(await membersRes.json());
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [familyId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const isOwner = currentMember?.role === 'OWNER';

  return (
    <div className="dashboard-page min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="dashboard-header mb-8 animate-fade-up">
          <p className="text-sm font-medium text-slate-500 mb-0.5">{greeting}</p>
          <h1 className="text-2xl font-bold text-slate-900">{currentMember?.name ?? ''}</h1>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 animate-fade-up delay-75">
          <div className="stat-card bg-white rounded-xl p-4 border border-slate-200 card-lift">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{members.length}</p>
                <p className="text-xs text-slate-500">Family Members</p>
              </div>
            </div>
          </div>

          <div className="stat-card bg-white rounded-xl p-4 border border-slate-200 card-lift">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{members.length}</p>
                <p className="text-xs text-slate-500">Records This Week</p>
              </div>
            </div>
          </div>

          <div className="stat-card bg-white rounded-xl p-4 border border-slate-200 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Today</p>
                <p className="text-xs text-slate-500">Last Activity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members section */}
        <div className="animate-fade-up delay-150">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Family Members</h2>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => setShowFamilySettings(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Family Settings</span>
                </button>
              )}
              <Link
                to="/add-record"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150"
              >
                <Plus className="w-4 h-4" />
                Add Record
              </Link>
            </div>
          </div>

          <div className="members-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? [0, 1, 2].map((i) => <MemberCardSkeleton key={i} />)
              : members.map((member, index) => (
                <div key={member.id} className="member-card-anim" style={{ animationDelay: `${index * 70}ms` }}>
                  <MemberCard member={member} />
                </div>
              ))
            }

            {/* Add member card */}
            <button
              onClick={() => setShowInvite(true)}
              className="add-member-card flex flex-col items-center justify-center gap-3 bg-white rounded-2xl p-5 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-200 min-h-[216px] group cursor-pointer w-full"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors duration-200">
                <UserPlus className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors duration-200" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors duration-200">Add Family Member</p>
                <p className="text-xs text-slate-400 mt-0.5">Track their health too</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {showInvite && <InviteModal inviteCode={inviteCode} onClose={() => setShowInvite(false)} />}
      {showFamilySettings && <FamilySettingsModal onClose={() => setShowFamilySettings(false)} />}
    </div>
  );
}
