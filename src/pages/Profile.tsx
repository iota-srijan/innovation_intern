import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Building, Bell, LogOut, Lock } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

type Section = 'account' | 'notifications';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(' ')
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, displayName, setDisplayName, signOut } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>('account');
  const [form, setForm] = useState(() => splitName(displayName));
  const [isSaving, setIsSaving] = useState(false);
  // Track whether the user has manually edited the name fields.
  // If they haven't, we sync once when displayName arrives from the auth context.
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!touchedRef.current && displayName) {
      setForm(splitName(displayName));
    }
  }, [displayName]);

  const [notifs, setNotifs] = useState({ master: true, lowStock: true, poDelays: true, weeklyReports: false });

  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || 'U'

  const handleSave = async () => {
    if (isSaving) return;
    const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ')
    if (!fullName) {
      toast.error('Name cannot be empty')
      return
    }
    if (!user?.id) {
      toast.error('Could not identify user — please sign in again')
      return
    }
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ display_name: fullName })
        .eq('user_id', user.id)
      if (error) {
        toast.error('Failed to save changes')
        return
      }
      setDisplayName(fullName)
      toast.success('Name updated successfully')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  };

  const handleSignOut = async () => {
    await signOut()
    toast.info("Signed out successfully")
    navigate("/signin")
  };

  const navItems: { icon: typeof User; label: string; key: Section }[] = [
    { icon: User,    label: "Account Details",   key: "account" },
    { icon: Bell,    label: "Notifications",      key: "notifications" },
  ];

  return (
    <AppShell title="Settings">
      <div className="p-5">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Settings</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Manage your account settings and preferences.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Left sidebar */}
          <div className="flex flex-col gap-4">
            {/* User card */}
            <div className="rounded-2xl border border-orange-100 bg-white p-6 dark:border-white/8 dark:bg-[#1f1509] flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="h-20 w-20 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-bold text-white uppercase">
                  {avatarInitials}
                </div>
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-[#1f1509]" />
              </div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {displayName}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">OPJU IdeaLab</p>
              <div className="w-full space-y-2 text-xs text-left text-zinc-600 border-t border-zinc-100 dark:border-white/8 pt-4">
                <div className="flex items-center gap-2.5 dark:text-zinc-400">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
                  <span className="break-all">{user?.email ?? ''}</span>
                </div>
                <div className="flex items-center gap-2.5 dark:text-zinc-400">
                  <Building className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
                  <span>OPJU IdeaLab</span>
                </div>
              </div>
            </div>

            {/* Nav list */}
            <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white dark:border-white/8 dark:bg-[#1f1509]">
              {navItems.map(({ icon: Icon, label, key }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex w-full items-center gap-3 border-l-2 p-4 text-xs font-medium transition-colors ${
                    activeSection === key
                      ? "border-orange-500 bg-orange-400/8 text-orange-400 dark:bg-orange-400/10"
                      : "border-transparent text-zinc-600 hover:bg-orange-50 dark:text-zinc-400 dark:hover:bg-white/4"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${activeSection === key ? "text-orange-400" : "text-zinc-400 dark:text-zinc-600"}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="md:col-span-2 flex flex-col gap-5">

            {/* ── ACCOUNT ── */}
            {activeSection === 'account' && (
              <>
                <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white dark:border-white/8 dark:bg-[#1f1509]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Personal Information</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Update your personal details here.</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">First Name</label>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={e => { touchedRef.current = true; setForm(f => ({ ...f, firstName: e.target.value })); }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Last Name</label>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={e => { touchedRef.current = true; setForm(f => ({ ...f, lastName: e.target.value })); }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={user?.email ?? ''}
                            readOnly
                            disabled
                            className="w-full rounded-lg border border-orange-100 bg-zinc-100 px-3 py-2 pr-8 text-sm text-zinc-500 outline-none cursor-not-allowed opacity-70 dark:border-white/8 dark:bg-white/4 dark:text-zinc-500"
                          />
                          <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
                        </div>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Managed by your OPJU Google account</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-medium rounded-full transition-colors cursor-pointer"
                      >
                        {isSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-zinc-100 dark:border-white/8 px-5 py-3 flex items-center justify-between bg-orange-50 dark:bg-white/4">
                    <span className="text-[10px] text-zinc-500">Active Session</span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeSection === 'notifications' && (
              <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white dark:border-white/8 dark:bg-[#1f1509]">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Notification Preferences</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Choose what we notify you about.</p>
                  </div>
                  <Toggle checked={notifs.master} onChange={() => setNotifs(n => ({ ...n, master: !n.master }))} />
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-white/6">
                  {[
                    { key: 'lowStock' as const,      title: 'Low Stock Alerts',  desc: 'Get notified when items drop below threshold.' },
                    { key: 'poDelays' as const,       title: 'PO Delays',         desc: 'Receive updates on delayed inbound shipments.' },
                    { key: 'weeklyReports' as const,  title: 'Weekly Reports',    desc: 'Get a summary of procurement activity each week.' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} className="flex items-center justify-between p-5 hover:bg-orange-50 dark:hover:bg-white/4 transition-colors">
                      <div>
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200">{title}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</div>
                      </div>
                      <Toggle checked={notifs[key]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
