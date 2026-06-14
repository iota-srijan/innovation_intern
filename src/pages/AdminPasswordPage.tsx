import { useState } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { getAdminEmail } from '../lib/adminUtils'

export default function AdminPasswordPage() {
  const { adminEmail: contextAdminEmail } = useAuth()
  const adminEmail = contextAdminEmail ?? localStorage.getItem('sp-admin-email')

  const [currentPassword, setCurrentPassword]   = useState('')
  const [newPassword, setNewPassword]           = useState('')
  const [confirmPassword, setConfirmPassword]   = useState('')
  const [isSubmitting, setIsSubmitting]         = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (!adminEmail) {
      toast.error('Could not determine logged-in admin email')
      return
    }

    setIsSubmitting(true)
    try {
      const adminAuthHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }

      // 1. Verify current password
      const verifyRes = await fetch('https://ltgqhpnfnscmweckkwye.supabase.co/functions/v1/admin-auth', {
        method: 'POST',
        headers: adminAuthHeaders,
        body: JSON.stringify({ action: 'verify', email: adminEmail, currentPassword }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyData?.success) {
        toast.error('Current password is incorrect')
        setIsSubmitting(false)
        return // Stop — do not proceed with update
      }

      // 2. Update password
      const updateRes = await fetch('https://ltgqhpnfnscmweckkwye.supabase.co/functions/v1/admin-auth', {
        method: 'POST',
        headers: adminAuthHeaders,
        body: JSON.stringify({ action: 'update-password', email: adminEmail, currentPassword, newPassword }),
      })
      const updateData = await updateRes.json()

      if (!updateData?.success) {
        toast.error(updateData?.error ?? 'Failed to update password')
        setIsSubmitting(false)
        return
      }

      // 3. Write audit log
      await supabase
        .from('audit_log')
        .insert({
          actor_email: getAdminEmail(contextAdminEmail),
          action: 'Changed admin password',
          action_type: 'admin_action',
        })

      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell title="Change Password">
      <div className="mx-auto max-w-[720px] px-6 pb-24 pt-6">

        {/* Back Link */}
        <Link 
          to="/admin/settings" 
          className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Change Password</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
            Update your admin account password
          </p>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-orange-400/10 p-2">
              <KeyRound className="h-4 w-4 text-orange-400 dark:text-orange-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Password Details</h2>
              {adminEmail && (
                <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-[#6e6e78]">{adminEmail}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Current Password <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                New Password <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Confirm New Password <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_20px_-10px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-px active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Update Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </AppShell>
  )
}
