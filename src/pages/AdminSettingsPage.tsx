import { Link, useNavigate } from 'react-router-dom'
import { Settings, User, Mail, Building, LogOut, Lock } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const { adminEmail: contextAdminEmail, signOut } = useAuth()
  const navigate = useNavigate()
  
  const adminEmail = contextAdminEmail ?? localStorage.getItem('sp-admin-email') ?? 'admin'

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.info("Signed out successfully")
      navigate("/")
    } catch {
      toast.error("Failed to sign out")
    }
  }

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.12] px-3 py-1.5 text-xs font-semibold text-violet-400">
            <Settings className="h-3.5 w-3.5" />
            Admin Settings
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-white">Settings</h1>
          <p className="mt-1 text-sm text-[#9a9aa6]">
            Manage your admin account and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Left sidebar */}
          <div className="flex flex-col gap-4">
            {/* User card */}
            <div className="rounded-2xl border border-white/10 bg-[#111114] p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="h-20 w-20 rounded-full bg-violet-700 flex items-center justify-center text-2xl font-bold text-white uppercase">
                  AD
                </div>
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#111114] bg-green-500" />
              </div>
              <h2 className="text-base font-bold text-white">Admin</h2>
              <p className="text-xs text-[#9a9aa6] mb-4">Administrator Role</p>
              
              <div className="w-full space-y-2 text-xs text-left text-[#6e6e78] border-t border-white/[0.08] pt-4">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="break-all">{adminEmail}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building className="h-3.5 w-3.5" />
                   <span>OPJU IdeaLab</span>
                </div>
              </div>
            </div>

            {/* Nav list */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
                <button
                  className="flex w-full items-center gap-3 border-l-2 p-4 text-xs font-medium transition-colors border-violet-600 bg-violet-500/10 text-violet-500"
                >
                  <User className="h-3.5 w-3.5 text-violet-500" />
                  Account Details
                </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="md:col-span-2 flex flex-col gap-5">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
              
              {/* Section 1: Personal Information */}
              <div className="border-b border-white/[0.08] px-5 py-4">
                <h3 className="text-sm font-semibold text-white">Personal Information</h3>
                <p className="text-xs text-[#9a9aa6] mt-0.5">Account email address.</p>
              </div>
              <div className="p-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f4f4f6]">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={adminEmail}
                      readOnly
                      disabled
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 pr-8 text-sm text-[#9a9aa6] outline-none cursor-not-allowed opacity-70"
                    />
                    <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6e6e78]" />
                  </div>
                  <p className="text-[10px] text-[#6e6e78]">Managed by StockPilot admin account</p>
                </div>
              </div>

              {/* Section 2: Password & Security */}
              <div className="border-t border-white/[0.08] px-5 py-4">
                <h3 className="text-sm font-semibold text-white">Password & Security</h3>
                <p className="text-xs text-[#9a9aa6] mt-0.5">Update your admin account password</p>
              </div>
              <div className="p-5 pt-0 mt-3">
                <Link
                  to="/admin/settings/password"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-500/40 px-4 py-2 text-[13px] font-semibold text-violet-400 transition hover:bg-violet-500/10"
                >
                  Change Password
                </Link>
              </div>

              {/* BOTTOM BAR */}
              <div className="border-t border-white/[0.08] px-5 py-3 flex items-center justify-between bg-white/[0.02]">
                <span className="text-[10px] text-[#6e6e78]">Active Session</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
