import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowLeft, PackageCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '../components/layout/AppShell';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import type { CartItem } from '../types';

interface StockConflict {
  item_id: string;
  item_name: string;
  requested: number;
  available: number;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, updatePurpose, clearCart } = useCart();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [submitCooldown, setSubmitCooldown] = useState(false);
  const [stockConflicts, setStockConflicts] = useState<StockConflict[]>([]);
  const [showPurposeError, setShowPurposeError] = useState(false);

  const isFaculty = userRole === 'faculty';
  const backUrl    = isFaculty ? '/faculty-dashboard' : '/student-dashboard';
  const requestsUrl = isFaculty ? '/faculty-requests' : '/student-dashboard';

  const studentEmail = user?.email ?? '';
  const studentName  = user?.user_metadata?.full_name ?? user?.email ?? (isFaculty ? 'Faculty' : 'Student');

  // Validate: all purposes filled
  const emptyPurposeIds = cart
    .filter((c) => !c.purpose.trim())
    .map((c) => c.item_id);

  const canSubmit = cart.length > 0 && emptyPurposeIds.length === 0;

  async function handleSubmit() {
    if (!canSubmit) {
      setShowPurposeError(true);
      return;
    }
    if (submitting || submitCooldown) return;
    setShowPurposeError(false);
    setStockConflicts([]);
    setSubmitting(true);

    try {
      // ── 1. Live stock check ──────────────────────────────────────────
      const itemIds = cart.map((c) => c.item_id);
      const { data: liveItems, error: stockError } = await supabase
        .from('inventory_items')
        .select('id, name, quantity')
        .in('id', itemIds);

      if (stockError) throw stockError;

      const conflicts: StockConflict[] = [];
      for (const cartItem of cart) {
        const live = liveItems?.find((i) => i.id === cartItem.item_id);
        if (live && cartItem.quantity_requested > live.quantity) {
          conflicts.push({
            item_id: cartItem.item_id,
            item_name: cartItem.item_name,
            requested: cartItem.quantity_requested,
            available: live.quantity,
          });
        }
      }
      if (conflicts.length > 0) {
        setStockConflicts(conflicts);
        setSubmitting(false);
        toast.error(`${conflicts.length} item(s) exceed current stock. Update quantities and try again.`);
        return;
      }

      // ── 2. Duplicate pending guard ────────────────────────────────────
      const { data: existingPending } = await supabase
        .from('issue_requests')
        .select('item_id')
        .eq('student_id', user?.id)
        .eq('status', 'pending')
        .in('item_id', itemIds);

      const pendingItemIds = new Set((existingPending ?? []).map((r: { item_id: string }) => r.item_id));
      const itemsToSubmit = cart.filter((c) => !pendingItemIds.has(c.item_id));
      const skipped = cart.filter((c) => pendingItemIds.has(c.item_id));

      if (skipped.length > 0) {
        skipped.forEach((s) =>
          toast.warning(`"${s.item_name}" already has a pending request — skipped.`)
        );
      }

      if (itemsToSubmit.length === 0) {
        toast.info('All items already have pending requests.');
        setSubmitting(false);
        return;
      }

      // ── 3. Batch insert ───────────────────────────────────────────────
      const rows = itemsToSubmit.map((c: CartItem) => ({
        item_id: c.item_id,
        item_name: c.item_name,
        quantity_requested: Math.min(Math.max(1, c.quantity_requested), 100),
        purpose: c.purpose.trim().slice(0, 500),
        status: 'pending',
        student_id: user?.id,
        student_email: studentEmail,
        student_name: studentName,
      }));

      const { error: insertError } = await supabase
        .from('issue_requests')
        .insert(rows);

      if (insertError) throw insertError;

      // Audit: one log entry per submitted item
      const auditRows = itemsToSubmit.map((c: CartItem) => ({
        actor_email: studentEmail || null,
        action: `Submitted request for ${c.item_name} x${c.quantity_requested}`,
        action_type: 'CREATE',
      }));
      try {
        await supabase.from('audit_log').insert(auditRows);
      } catch {
        // audit failures are non-fatal
      }

      // Clear cart: reset state and ensure localStorage key is fully removed
      clearCart();
      localStorage.removeItem('sp-cart');
      toast.success(
        `${itemsToSubmit.length} request${itemsToSubmit.length > 1 ? 's' : ''} submitted! Awaiting approval.`
      );
      // Invalidate appropriate queries
      await queryClient.invalidateQueries({ queryKey: ['issue_requests'] });
      await queryClient.invalidateQueries({ queryKey: ['issue_requests', 'mine', studentEmail] });
      await queryClient.invalidateQueries({ queryKey: ['issue_requests', 'faculty-mine', studentEmail] });
      navigate(isFaculty ? '/faculty-requests' : '/student-dashboard');
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
      setSubmitCooldown(true);
      setTimeout(() => setSubmitCooldown(false), 3000);
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <AppShell title="Your Cart">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-zinc-800/60 border border-gray-200 dark:border-white/8">
            <ShoppingCart className="h-9 w-9 text-gray-400 dark:text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your cart is empty</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
            Browse the IdeaLab inventory and add components you need to your cart.
          </p>
          <Link
            to={backUrl}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Inventory
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your Cart">
      <div className="flex flex-col gap-5 p-5 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={backUrl}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Inventory
            </Link>
            <span className="text-gray-300 dark:text-zinc-700">·</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
            </span>
          </div>
          <button
            onClick={() => { clearCart(); }}
            className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            Clear cart
          </button>
        </div>

        {/* Stock conflict warnings */}
        {stockConflicts.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-sm font-medium text-red-300">Stock conflicts detected</span>
            </div>
            <ul className="space-y-1">
              {stockConflicts.map((c) => (
                <li key={c.item_id} className="text-xs text-red-400">
                  <span className="font-medium">{c.item_name}</span>: you requested{' '}
                  <span className="font-semibold">{c.requested}</span> but only{' '}
                  <span className="font-semibold">{c.available}</span> available.
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cart items */}
        <div className="flex flex-col gap-3">
          {cart.map((item) => {
            const hasConflict = stockConflicts.some((c) => c.item_id === item.item_id);
            const missingPurpose = showPurposeError && !item.purpose.trim();

            return (
              <div
                key={item.item_id}
                className={`rounded-2xl border p-5 transition-colors bg-white dark:bg-[#1f1509] ${
                  hasConflict
                    ? 'border-red-500/50'
                    : 'border-gray-200 dark:border-white/8'
                }`}
              >
                {/* Item header row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {item.item_name}
                      </span>
                      {hasConflict && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 uppercase tracking-wide flex-shrink-0">
                          Stock conflict
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 dark:text-zinc-500 mt-0.5">{item.sku}</div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.item_id)}
                    className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Remove from cart"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Quantity + Purpose row */}
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Quantity
                      <span className="normal-case text-gray-400 dark:text-zinc-600 ml-1">(max {item.available_quantity})</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.item_id, item.quantity_requested - 1)}
                        disabled={item.quantity_requested <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white dark:hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        {item.quantity_requested}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.item_id, item.quantity_requested + 1)}
                        disabled={item.quantity_requested >= item.available_quantity}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white dark:hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Purpose / Project Description
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <textarea
                      value={item.purpose}
                      maxLength={500}
                      onChange={(e) => updatePurpose(item.item_id, e.target.value)}
                      placeholder="Describe your project or reason for this component…"
                      rows={2}
                      className={`w-full rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 dark:text-white dark:placeholder:text-zinc-600 focus:outline-none transition-colors resize-none ${
                        missingPurpose
                          ? 'bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-500/60 focus:border-red-400'
                          : 'bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 focus:border-orange-400 dark:focus:border-orange-400'
                      }`}
                    />
                    {missingPurpose && (
                      <p className="mt-1 text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        Purpose is required before submitting.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit footer */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1f1509] p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {cart.length} item{cart.length !== 1 ? 's' : ''} ready to request
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              All requests go to admin for approval
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitCooldown || cart.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            <PackageCheck className="h-4 w-4" />
            {submitting ? 'Submitting…' : submitCooldown ? 'Submitted' : 'Submit All Requests'}
          </button>
        </div>

        {/* Link to existing requests */}
        <div className="text-center">
          <Link
            to={requestsUrl}
            className="text-xs text-gray-500 hover:text-orange-500 dark:text-zinc-500 dark:hover:text-orange-300 transition-colors"
          >
            View my previous requests →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
