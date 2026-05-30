import { useCallback, useEffect, useRef, useState } from 'react'
import { Package, Plus, Search, Pencil, Trash2, Upload, X, FolderPlus } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

interface Category {
  id: string
  name: string
}

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  category_id: string | null
  categories: { id: string; name: string } | { id: string; name: string }[] | null
  quantity: number
  reorder_threshold: number | null
  supplier: string | null
  unit_price: number | null
  status: ItemStatus | null
  created_at: string
}

interface ItemFormData {
  name: string
  sku: string
  category_id: string
  quantity: string
  reorder_threshold: string
  supplier: string
  unit_price: string
  status: ItemStatus
}

const BLANK_FORM: ItemFormData = {
  name: '',
  sku: '',
  category_id: '',
  quantity: '',
  reorder_threshold: '',
  supplier: '',
  unit_price: '',
  status: 'in_stock',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCatName(raw: InventoryItem['categories']): string {
  if (!raw) return 'Uncategorized'
  if (Array.isArray(raw)) return raw[0]?.name ?? 'Uncategorized'
  return raw.name
}

function stockBarColor(qty: number, threshold: number | null): string {
  if (qty === 0) return 'bg-red-500'
  if (threshold !== null && qty <= threshold) return 'bg-yellow-400'
  return 'bg-green-400'
}

function stockBarPct(qty: number, threshold: number | null): number {
  if (qty === 0) return 0
  const max = Math.max(qty, (threshold ?? 0) * 2, 30)
  return Math.min(100, Math.round((qty / max) * 100))
}

const CAT_COLORS = [
  'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'text-violet-400 bg-violet-400/10 border-violet-400/20',
  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ItemStatus | null }) {
  const s = status ?? 'in_stock'
  const cls: Record<ItemStatus, string> = {
    in_stock:     'text-green-400 bg-green-400/10 border-green-400/20',
    low_stock:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    out_of_stock: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  const label: Record<ItemStatus, string> = {
    in_stock:     'In Stock',
    low_stock:    'Low Stock',
    out_of_stock: 'Out of Stock',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls[s]}`}>
      {label[s]}
    </span>
  )
}

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-4 backdrop-blur-[6px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

// ─── Item Form Modal ──────────────────────────────────────────────────────────

interface ItemFormModalProps {
  title: string
  form: ItemFormData
  categories: Category[]
  submitting: boolean
  onChange: (f: ItemFormData) => void
  onSubmit: () => void
  onClose: () => void
}

function ItemFormModal({ title, form, categories, submitting, onChange, onSubmit, onClose }: ItemFormModalProps) {
  const inp = 'w-full rounded-[10px] border border-white/10 bg-[#0a0a0b] px-3 py-2.5 text-[13.5px] text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]'

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/[0.04] text-[#9a9aa6] transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
              Name <span className="text-violet-400">*</span>
            </label>
            <input
              className={inp}
              value={form.name}
              onChange={e => onChange({ ...form, name: e.target.value })}
              placeholder="Arduino Uno R3"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
              SKU <span className="text-violet-400">*</span>
            </label>
            <input
              className={inp}
              value={form.sku}
              onChange={e => onChange({ ...form, sku: e.target.value })}
              placeholder="ARD-UNO-R3"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">Category</label>
            <select
              className={inp + ' appearance-none cursor-pointer'}
              value={form.category_id}
              onChange={e => onChange({ ...form, category_id: e.target.value })}
            >
              <option value="">— Select category —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">Status</label>
            <select
              className={inp + ' appearance-none cursor-pointer'}
              value={form.status}
              onChange={e => onChange({ ...form, status: e.target.value as ItemStatus })}
            >
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
              Quantity <span className="text-violet-400">*</span>
            </label>
            <input
              className={inp}
              type="number"
              min="0"
              value={form.quantity}
              onChange={e => onChange({ ...form, quantity: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">Reorder Threshold</label>
            <input
              className={inp}
              type="number"
              min="0"
              value={form.reorder_threshold}
              onChange={e => onChange({ ...form, reorder_threshold: e.target.value })}
              placeholder="10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">Supplier</label>
            <input
              className={inp}
              value={form.supplier}
              onChange={e => onChange({ ...form, supplier: e.target.value })}
              placeholder="Supplier name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">Unit Price ₹</label>
            <input
              className={inp}
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={e => onChange({ ...form, unit_price: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!form.name.trim() || !form.sku.trim() || !form.quantity || submitting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {title === 'Edit Item' ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')

  // Add/Edit form
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<ItemFormData>(BLANK_FORM)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // New category
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catSubmitting, setCatSubmitting] = useState(false)

  // CSV import
  const csvRef = useRef<HTMLInputElement>(null)
  const initRef = useRef(false)

  // ── Audit log helper ──────────────────────────────────────────────────────

  const logAudit = async (action: string, actionType: 'CREATE' | 'UPDATE' | 'DELETE') => {
    try {
      await supabase
        .from('audit_log')
        .insert({ actor_email: user?.email ?? null, action, action_type: actionType })
    } catch {
      // audit failures are non-fatal
    }
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await supabase.from('categories').select('id, name').order('name')
      setCategories((data ?? []) as Category[])
    } catch {
      // non-fatal
    }
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, categories(id, name)')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load inventory: ' + error.message)
      } else {
        setItems((data ?? []) as InventoryItem[])
      }
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    void fetchCategories()
    void fetchItems()
  }, [fetchCategories, fetchItems])

  // ── Derived state ─────────────────────────────────────────────────────────

  const catCounts: Record<string, number> = {}
  items.forEach(item => {
    const cid = item.category_id ?? '__none__'
    catCounts[cid] = (catCounts[cid] ?? 0) + 1
  })

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.sku ?? '').toLowerCase().includes(q)
    const matchCat = activeCat === 'all' || item.category_id === activeCat
    return matchSearch && matchCat
  })

  // ── Add / Edit ────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditItem(null)
    setForm(BLANK_FORM)
    setShowForm(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditItem(item)
    setForm({
      name: item.name,
      sku: item.sku ?? '',
      category_id: item.category_id ?? '',
      quantity: String(item.quantity ?? 0),
      reorder_threshold: item.reorder_threshold != null ? String(item.reorder_threshold) : '',
      supplier: item.supplier ?? '',
      unit_price: item.unit_price != null ? String(item.unit_price) : '',
      status: item.status ?? 'in_stock',
    })
    setShowForm(true)
  }

  const handleSubmitItem = async () => {
    if (!form.name.trim() || !form.sku.trim() || formSubmitting) return
    setFormSubmitting(true)

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category_id: form.category_id || null,
      quantity: parseInt(form.quantity) || 0,
      reorder_threshold: form.reorder_threshold ? parseInt(form.reorder_threshold) : null,
      supplier: form.supplier.trim() || null,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      status: form.status,
    }

    try {
      if (editItem) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editItem.id)
        if (error) throw new Error(error.message)
        toast.success('Item updated')
        await logAudit(`Updated item ${payload.name} (SKU: ${payload.sku})`, 'UPDATE')
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload)
        if (error) throw new Error(error.message)
        toast.success('Item added')
        await logAudit(`Added item ${payload.name} (SKU: ${payload.sku}) to inventory`, 'CREATE')
      }
      setShowForm(false)
      await fetchItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save item')
    } finally {
      setFormSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget || deleteSubmitting) return
    setDeleteSubmitting(true)
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', deleteTarget.id)
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('issue_request') || msg.includes('foreign key') || msg.includes('violates')) {
          toast.error('Cannot delete item with active requests')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success(`"${deleteTarget.name}" deleted`)
        await logAudit(`Deleted item ${deleteTarget.name} (SKU: ${deleteTarget.sku ?? ''}) from inventory`, 'DELETE')
        setDeleteTarget(null)
        await fetchItems()
      }
    } catch {
      toast.error('Failed to delete item')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── New category ──────────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCatName.trim() || catSubmitting) return
    setCatSubmitting(true)
    try {
      const { error } = await supabase.from('categories').insert({ name: newCatName.trim() })
      if (error) throw new Error(error.message)
      toast.success(`Category "${newCatName.trim()}" created`)
      setNewCatName('')
      setShowCatModal(false)
      await fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setCatSubmitting(false)
    }
  }

  // ── CSV import ────────────────────────────────────────────────────────────

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    let text = ''
    try {
      text = await file.text()
    } catch {
      toast.error('Could not read file')
      return
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) {
      toast.error('CSV is empty or has no data rows')
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/^"|"$/g, ''))
    const REQUIRED = ['name', 'sku', 'quantity']
    const missing = REQUIRED.filter(r => !headers.includes(r))
    if (missing.length) {
      toast.error(`CSV missing required columns: ${missing.join(', ')}`)
      return
    }

    const rows: Record<string, string>[] = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      if (!row['name']?.trim() || !row['sku']?.trim() || !row['quantity']?.trim()) {
        skipped++
        continue
      }
      const statusVal = row['status'] ?? ''
      const payload = {
        name: row['name'].trim(),
        sku: row['sku'].trim(),
        quantity: parseInt(row['quantity']) || 0,
        reorder_threshold: row['reorder_threshold'] ? parseInt(row['reorder_threshold']) : null,
        supplier: row['supplier']?.trim() || null,
        unit_price: row['unit_price'] ? parseFloat(row['unit_price']) : null,
        status: (['in_stock', 'low_stock', 'out_of_stock'].includes(statusVal)
          ? statusVal
          : 'in_stock') as ItemStatus,
      }
      try {
        const { error } = await supabase.from('inventory_items').insert(payload)
        if (error) { skipped++ } else { imported++ }
      } catch {
        skipped++
      }
    }

    if (imported > 0) {
      const msg = `Imported ${imported} item${imported !== 1 ? 's' : ''} successfully`
      toast.success(skipped ? `${msg} (${skipped} skipped)` : msg)
      await logAudit(`Bulk imported ${imported} items via CSV`, 'CREATE')
      await fetchItems()
    } else {
      toast.error(`All rows failed to import${skipped ? ` (${skipped} skipped)` : ''}`)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Inventory">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-gradient-to-b from-violet-500 to-violet-700 shadow-[0_8px_20px_-10px_rgba(124,58,237,0.7)]">
              <Package className="h-5 w-5 text-white" />
            </span>
            <div>
              <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-white">Inventory Management</h1>
              <p className="text-xs text-[#9a9aa6]">Manage all IdeaLab equipment and supplies</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCatModal(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-white/[0.07]"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              + New Category
            </button>

            <button
              onClick={() => csvRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-white/[0.07]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { void handleCsvFile(e) }}
            />

            <button
              onClick={openAdd}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_20px_-10px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Filter tabs + search row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCat('all')}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                activeCat === 'all'
                  ? 'border-transparent bg-[#7c3aed] text-white'
                  : 'border-white/10 text-[#9a9aa6] hover:border-white/20 hover:text-white'
              }`}
            >
              All <span className="ml-1 tabular-nums opacity-70">{items.length}</span>
            </button>
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                  activeCat === cat.id
                    ? 'border-transparent bg-[#7c3aed] text-white'
                    : 'border-white/10 text-[#9a9aa6] hover:border-white/20 hover:text-white'
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${CAT_COLORS[idx % CAT_COLORS.length].split(' ')[0].replace('text-', 'bg-')}`} />
                {cat.name} <span className="ml-1 tabular-nums opacity-70">{catCounts[cat.id] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e6e78]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or SKU…"
              className="w-56 rounded-xl border border-white/10 bg-[#111114] py-2 pl-9 pr-3 text-[13px] text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500/60"
            />
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-2xl border border-white/10 bg-[#111114]">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Package className="h-10 w-10 text-[#4b4b57]" />
              <p className="text-sm text-[#6e6e78]">
                {search || activeCat !== 'all'
                  ? 'No items match your search'
                  : 'No items yet. Add your first item.'}
              </p>
              {!search && activeCat === 'all' && (
                <button
                  onClick={openAdd}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-2 text-[13px] font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {['Item / SKU', 'Category', 'Stock', 'Available', 'Status', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-widest text-[#6e6e78]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map(item => {
                    const qty = item.quantity ?? 0
                    const threshold = item.reorder_threshold ?? null
                    const barColor = stockBarColor(qty, threshold)
                    const barPct = stockBarPct(qty, threshold)
                    const catIdx = categories.findIndex(c => c.id === item.category_id)
                    const catName = getCatName(item.categories)
                    const catCls = catIdx >= 0
                      ? CAT_COLORS[catIdx % CAT_COLORS.length]
                      : 'text-[#6e6e78] bg-white/[0.04] border-white/[0.08]'

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                        {/* Item / SKU */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#f4f4f6]">{item.name}</div>
                          <div className="mt-0.5 font-mono text-[10.5px] text-[#6e6e78]">
                            {item.sku ?? '—'}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${catCls}`}>
                            {catName}
                          </span>
                        </td>

                        {/* Stock bar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-8 shrink-0 text-right text-[12px] font-bold tabular-nums text-[#f4f4f6]">
                              {qty}
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Available */}
                        <td className="px-4 py-3.5">
                          <span className="font-semibold tabular-nums text-[#f4f4f6]">{qty}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEdit(item)}
                              title="Edit"
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#9a9aa6] transition hover:border-violet-500/40 hover:text-violet-400"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              title="Delete"
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#9a9aa6] transition hover:border-red-400/40 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <ItemFormModal
          title={editItem ? 'Edit Item' : 'Add Item'}
          form={form}
          categories={categories}
          submitting={formSubmitting}
          onChange={setForm}
          onSubmit={() => { void handleSubmitItem() }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <ModalBackdrop onClose={() => setDeleteTarget(null)}>
          <div className="w-full max-w-[380px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
            <h2 className="mb-2 text-[16px] font-bold text-white">Delete Item?</h2>
            <p className="mb-6 text-[13px] text-[#9a9aa6]">
              Delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleDelete() }}
                disabled={deleteSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleteSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Delete
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ── New Category Modal ── */}
      {showCatModal && (
        <ModalBackdrop onClose={() => { setShowCatModal(false); setNewCatName('') }}>
          <div className="w-full max-w-[380px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-white">New Category</h2>
              <button
                onClick={() => { setShowCatModal(false); setNewCatName('') }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/[0.04] text-[#9a9aa6] transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
              Category name <span className="text-violet-400">*</span>
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAddCategory() }}
              placeholder="e.g. Electronics"
              className="mb-5 w-full rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCatModal(false); setNewCatName('') }}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddCategory()}
                disabled={!newCatName.trim() || catSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {catSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Create Category
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </AppShell>
  )
}
