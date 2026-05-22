import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Building, Bell, Monitor, Shield, LogOut, CheckCircle2, Sun, Moon, Laptop } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { toast } from "sonner";

function getDeviceDetails(isDetailed = false) {
  const ua = navigator.userAgent;
  let os = "Windows";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "macOS";
  else if (ua.indexOf("X11") !== -1) os = "UNIX";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";

  let browser = "Chrome";
  if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Edg") === -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Edg") !== -1) browser = "Edge";

  if (isDetailed) {
    let version = "";
    const match = ua.match(/(Chrome|Firefox|Safari|Edg)\/([\d.]+)/);
    if (match && match[2]) {
      version = " " + match[2].split(".")[0];
    }
    return `${os} — ${browser}${version}`;
  }

  return `${os}, ${browser}`;
}

type Section = 'account' | 'notifications' | 'appearance' | 'security';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-violet-700' : 'bg-zinc-300 dark:bg-zinc-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('account');
  
  const [savedProfile, setSavedProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("stockpilot-profile");
      return saved ? JSON.parse(saved) : { firstName: 'Shrijan', lastName: 'Mishra', email: 'shrijan@stockpilot.inc' };
    } catch {
      return { firstName: 'Shrijan', lastName: 'Mishra', email: 'shrijan@stockpilot.inc' };
    }
  });

  const [form, setForm] = useState(savedProfile);

  const [notifs, setNotifs] = useState({ master: true, lowStock: true, poDelays: true, weeklyReports: false });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const handleSave = () => {
    try {
      localStorage.setItem("stockpilot-profile", JSON.stringify(form));
      setSavedProfile(form);
      window.dispatchEvent(new Event("profile-updated"));
      toast.success('Changes saved successfully');
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const navItems: { icon: typeof User; label: string; key: Section }[] = [
    { icon: User,    label: "Account Details",   key: "account" },
    { icon: Bell,    label: "Notifications",      key: "notifications" },
    { icon: Monitor, label: "Appearance",         key: "appearance" },
    { icon: Shield,  label: "Security & Activity",key: "security" },
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="h-20 w-20 rounded-full bg-violet-700 flex items-center justify-center text-2xl font-bold text-white uppercase">
                  {((savedProfile.firstName?.[0] || "") + (savedProfile.lastName?.[0] || "")) || "SM"}
                </div>
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-[#1a1a1a]" />
              </div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {savedProfile.firstName} {savedProfile.lastName}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Innovation Intern</p>
              <div className="w-full space-y-2 text-xs text-left text-zinc-600 border-t border-zinc-100 dark:border-white/8 pt-4">
                <div className="flex items-center gap-2.5 dark:text-zinc-400">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
                  <span className="break-all">{savedProfile.email}</span>
                </div>
                <div className="flex items-center gap-2.5 dark:text-zinc-400">
                  <Building className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
                  <span>StockPilot Inc.</span>
                </div>
              </div>
            </div>

            {/* Nav list */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
              {navItems.map(({ icon: Icon, label, key }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex w-full items-center gap-3 border-l-2 p-4 text-xs font-medium transition-colors ${
                    activeSection === key
                      ? "border-violet-600 bg-violet-500/8 text-violet-500 dark:bg-violet-500/10"
                      : "border-transparent text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-white/4"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${activeSection === key ? "text-violet-500" : "text-zinc-400 dark:text-zinc-600"}`} />
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
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Personal Information</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Update your photo and personal details here.</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">First Name</label>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={e => setForm({ ...form, firstName: e.target.value })}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-violet-600 focus:ring-1 focus:ring-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Last Name</label>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={e => setForm({ ...form, lastName: e.target.value })}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-violet-600 focus:ring-1 focus:ring-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Email Address</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-violet-600 focus:ring-1 focus:ring-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium rounded-full transition-colors cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent activity */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Activity</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Your recent actions across the workspace.</p>
                  </div>
                  <div className="p-5">
                    <div className="relative border-l border-zinc-200 dark:border-white/8 ml-3 space-y-5">
                      <div className="relative pl-6">
                        <span className="absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a] ring-2 ring-zinc-200 dark:ring-white/10">
                          <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                        </span>
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200">Approved PO-2024-085</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Today at 10:42 AM</div>
                      </div>
                      <div className="relative pl-6">
                        <span className="absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a] ring-2 ring-zinc-200 dark:ring-white/10">
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                        </span>
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200">Logged in from New Device</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Yesterday at 4:15 PM · {getDeviceDetails()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-zinc-100 dark:border-white/8 px-5 py-3 flex items-center justify-between bg-zinc-50 dark:bg-white/4">
                    <span className="text-[10px] text-zinc-500">Active Session: 2 hours</span>
                    <button
                      onClick={() => {
                        toast.info("Signed out successfully");
                        navigate("/");
                      }}
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
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Notification Preferences</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Choose what we notify you about.</p>
                  </div>
                  <Toggle checked={notifs.master} onChange={() => setNotifs(n => ({ ...n, master: !n.master }))} />
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-white/6">
                  {[
                    { key: 'lowStock' as const,       title: 'Low Stock Alerts',  desc: 'Get notified when items drop below threshold.' },
                    { key: 'poDelays' as const,        title: 'PO Delays',         desc: 'Receive updates on delayed inbound shipments.' },
                    { key: 'weeklyReports' as const,   title: 'Weekly Reports',    desc: 'Get a summary of procurement activity each week.' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} className="flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-white/4 transition-colors">
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

            {/* ── APPEARANCE ── */}
            {activeSection === 'appearance' && (
              <div className="flex flex-col gap-5">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Theme</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Select your preferred interface theme.</p>
                  </div>
                  <div className="p-5 grid grid-cols-3 gap-3">
                    {([
                      { value: 'light',  label: 'Light',  icon: Sun },
                      { value: 'dark',   label: 'Dark',   icon: Moon },
                      { value: 'system', label: 'System', icon: Laptop },
                    ] as { value: typeof theme; label: string; icon: typeof Sun }[]).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-xs font-medium transition-colors ${
                          theme === value
                            ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                            : 'border-zinc-200 dark:border-white/8 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Density</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Control how compact the interface appears.</p>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    {(['comfortable', 'compact'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={`rounded-xl border-2 p-4 text-xs font-medium capitalize transition-colors ${
                          density === d
                            ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                            : 'border-zinc-200 dark:border-white/8 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {activeSection === 'security' && (
              <div className="flex flex-col gap-5">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Change Password</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Update your password to keep your account secure.</p>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Last changed 3 months ago</span>
                    <button
                      onClick={() => toast.info('Password reset email sent')}
                      className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/6 transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
                  <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/8">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Active Sessions</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Devices currently logged into your account.</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-white/8 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/8">
                          <Laptop className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200">{getDeviceDetails(true)}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">IP 192.168.1.42 · Last active 2 hours ago</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Current</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
