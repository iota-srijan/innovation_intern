import { useState } from 'react'
import { Mail, Copy, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { buildGmailComposeUrl, openGmailCompose, type GmailComposeParams } from '../../lib/gmail'

interface RequestSubmittedModalProps {
  title: string
  description: string
  gmail: GmailComposeParams
  onClose: () => void
  /** Label for the bottom close button. Defaults to "Done". */
  closeLabel?: string
  /**
   * When provided, renders a second primary action button between "Open
   * Gmail Draft" and the close button. Used by approval flows to gate the
   * actual database write behind an explicit "I sent it" confirmation,
   * rather than committing the approval before the email is even drafted
   * — see SuperAdminDashboard.tsx / ServiceRequestsPanel.tsx.
   */
  confirmLabel?: string
  onConfirm?: () => void
  confirmLoading?: boolean
}

export function RequestSubmittedModal({
  title, description, gmail, onClose, closeLabel = 'Done', confirmLabel, onConfirm, confirmLoading,
}: RequestSubmittedModalProps) {
  const [blocked, setBlocked] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = buildGmailComposeUrl(gmail)

  const handleOpenGmail = () => {
    const opened = openGmailCompose(gmail)
    if (!opened) setBlocked(true)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-6 backdrop-blur-[6px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">{description}</p>

        <button
          onClick={handleOpenGmail}
          className="mb-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 py-3 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-opacity hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          Open Gmail Draft
        </button>

        {blocked && (
          <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] p-3">
            <p className="mb-2 text-[12px] text-amber-300">
              Your browser blocked the popup. Use the link below instead:
            </p>
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-2 text-[11px] text-gray-600 dark:text-[#9a9aa6] hover:text-orange-400"
              >
                {url}
              </a>
              <button
                onClick={() => void handleCopyLink()}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] hover:text-gray-900 dark:hover:text-white"
                title="Copy link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        {onConfirm && (
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className="mb-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-green-500 to-green-700 py-3 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {confirmLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {confirmLabel}
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  )
}
