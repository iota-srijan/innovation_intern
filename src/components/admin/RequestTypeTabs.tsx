import { Package, Wrench } from 'lucide-react'

export type RequestTypeTab = 'equipment' | 'service'

const TABS: { key: RequestTypeTab; label: string; icon: typeof Package }[] = [
  { key: 'equipment', label: 'Equipment Requests', icon: Package },
  { key: 'service', label: 'Service Requests', icon: Wrench },
]

export function RequestTypeTabs({ active, onChange }: { active: RequestTypeTab; onChange: (tab: RequestTypeTab) => void }) {
  return (
    <div className="mb-6 flex items-center gap-1.5">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-semibold transition-all ${
            active === key
              ? 'border-transparent bg-[#f97316] text-white'
              : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
