import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Megaphone, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

// ─── Types ─────────────────────────────────────────────────────────────────

type DemandStatus = "pending" | "under_review" | "approved" | "rejected";
type FilterTab = "all" | DemandStatus;

interface Demand {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: DemandStatus;
  faculty_note: string | null;
  created_by: string | null;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  vote_count: number;
  user_voted: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-violet-700",
  "from-cyan-500 to-cyan-700",
  "from-orange-400 to-red-600",
  "from-purple-400 to-purple-700",
  "from-amber-400 to-orange-600",
  "from-blue-400 to-blue-700",
  "from-green-400 to-green-700",
  "from-pink-400 to-pink-700",
];

function avatarGradient(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = ((h * 31) + email.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

const CATEGORY_CLS: Record<string, string> = {
  "IoT Devices":  "text-cyan-400 bg-cyan-400/10",
  "3D Printing":  "text-orange-400 bg-orange-400/10",
  "Electronics":  "text-yellow-400 bg-yellow-400/10",
  "Software":     "text-purple-400 bg-purple-400/10",
  "Other":        "text-[#9ca3af] bg-[#9ca3af]/10",
};

const STATUS_CLS: Record<string, string> = {
  pending:      "text-amber-400 bg-amber-400/10",
  under_review: "text-blue-400 bg-blue-400/10",
  approved:     "text-green-400 bg-green-400/10",
  rejected:     "text-red-400 bg-red-400/10",
};

const STATUS_LABEL: Record<string, string> = {
  pending:      "Pending",
  under_review: "Under Review",
  approved:     "Approved",
  rejected:     "Rejected",
};

const CATEGORIES = ["IoT Devices", "3D Printing", "Electronics", "Software", "Other"];

// ─── Shared sub-components ─────────────────────────────────────────────────

function CategoryDot({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${CATEGORY_CLS[category] ?? CATEGORY_CLS["Other"]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_CLS[status] ?? STATUS_CLS["pending"]}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Avatar({ name, email }: { name: string; email: string }) {
  return (
    <span className={`inline-grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-gradient-to-br text-[11.5px] font-bold text-white ${avatarGradient(email)}`}>
      {getInitials(name || email.split("@")[0])}
    </span>
  );
}

function Modal({ onBackdropClick, children }: { onBackdropClick: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.72)] p-6 backdrop-blur-[6px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onBackdropClick(); }}
    >
      {children}
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/[0.04] text-[#9a9aa6] transition hover:bg-white/[0.08] hover:text-white"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

// ─── Student Card ──────────────────────────────────────────────────────────

function StudentCard({
  demand, userId, onVote, voting,
}: {
  demand: Demand;
  userId: string | undefined;
  onVote: (d: Demand) => void;
  voting: boolean;
}) {
  const isOwn = demand.created_by === userId;
  const canVote = !isOwn && !demand.user_voted;

  return (
    <article className="flex gap-4 rounded-2xl border border-white/10 bg-[#111114] px-5 py-[18px] transition-colors hover:border-white/[0.16]">
      {/* Upvote button */}
      <button
        onClick={() => canVote && !voting && onVote(demand)}
        disabled={!canVote || voting}
        aria-pressed={demand.user_voted}
        className={`flex w-14 flex-shrink-0 flex-col items-center gap-1 rounded-xl border py-2.5 transition-all ${
          demand.user_voted
            ? "cursor-default border-transparent bg-[#7c3aed] text-white shadow-[0_8px_20px_-10px_rgba(124,58,237,0.85)]"
            : canVote
            ? "cursor-pointer border-white/10 bg-white/[0.03] text-[#9a9aa6] hover:border-violet-500/50 hover:text-white"
            : "cursor-default border-white/[0.06] bg-white/[0.02] text-[#6e6e78]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        <span className="text-base font-bold tabular-nums">{demand.vote_count}</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.06em] opacity-70">votes</span>
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-[#f4f4f6]">
          {demand.title}
        </h3>
        {demand.description && (
          <p className="mb-3 line-clamp-2 text-[13.5px] leading-relaxed text-[#9a9aa6]">
            {demand.description}
          </p>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryDot category={demand.category} />
          <StatusBadge status={demand.status} />
          <span className="text-xs text-[#6e6e78]">· {timeAgo(demand.created_at)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Avatar name={demand.created_by_name} email={demand.created_by_email} />
          <span className="text-[13px] font-semibold text-[#f4f4f6]">
            {demand.created_by_name || demand.created_by_email.split("@")[0]}
          </span>
          <span className="text-xs text-[#6e6e78]">·</span>
          <span className="text-xs text-[#6e6e78]">{demand.created_by_email}</span>
        </div>
        {/* Faculty note (approved / rejected) */}
        {(demand.status === "approved" || demand.status === "rejected") && demand.faculty_note && (
          <div className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-[12.5px] leading-relaxed ${
            demand.status === "approved"
              ? "border-green-400/[0.22] bg-green-400/[0.08] text-[#cdebd6]"
              : "border-red-400/[0.22] bg-red-400/[0.08] text-[#fecaca]"
          }`}>
            {demand.status === "approved" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
            <p>{demand.faculty_note}</p>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Faculty Card ──────────────────────────────────────────────────────────

function FacultyCard({
  demand, onMarkReview, onOpenAction,
}: {
  demand: Demand;
  onMarkReview: (d: Demand) => void;
  onOpenAction: (type: "approve" | "reject", d: Demand) => void;
}) {
  const isActionable = demand.status === "pending" || demand.status === "under_review";

  return (
    <article className="flex items-stretch gap-4 rounded-2xl border border-white/10 bg-[#111114] px-5 py-[18px] transition-colors hover:border-white/[0.16]">
      {/* Vote count (display only) */}
      <div className="flex w-14 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[#6e6e78]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-45">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        <span className="text-[17px] font-bold tabular-nums text-[#9a9aa6]">{demand.vote_count}</span>
        <span className="text-[9.5px] font-medium uppercase tracking-[0.06em]">votes</span>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-[#f4f4f6]">
          {demand.title}
        </h3>
        {demand.description && (
          <p className="mb-3 line-clamp-2 text-[13.5px] leading-relaxed text-[#9a9aa6]">
            {demand.description}
          </p>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryDot category={demand.category} />
          <StatusBadge status={demand.status} />
          <span className="text-xs text-[#6e6e78]">· {timeAgo(demand.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-[#6e6e78]">Submitted by</span>
          <Avatar name={demand.created_by_name} email={demand.created_by_email} />
          <span className="text-[13px] font-semibold text-[#f4f4f6]">
            {demand.created_by_name || demand.created_by_email.split("@")[0]}
          </span>
          <span className="text-xs text-[#6e6e78]">·</span>
          <span className="text-xs text-[#6e6e78]">{demand.created_by_email}</span>
        </div>
      </div>

      {/* Actions column */}
      {isActionable ? (
        <div className="flex w-[170px] flex-shrink-0 flex-col justify-center gap-2 border-l border-white/[0.06] pl-4">
          {demand.status === "pending" && (
            <button
              onClick={() => onMarkReview(demand)}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-blue-400/45 bg-transparent px-3 py-2 text-[13px] font-semibold text-blue-400 transition-all hover:border-blue-400 hover:bg-blue-400/10 active:translate-y-px"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              Mark Under Review
            </button>
          )}
          <button
            onClick={() => onOpenAction("approve", demand)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-green-400/40 bg-green-400/[0.14] px-3 py-2 text-[13px] font-semibold text-green-400 transition-all hover:bg-green-400/[0.22] active:translate-y-px"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Approve
          </button>
          <button
            onClick={() => onOpenAction("reject", demand)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-red-400/35 bg-red-400/10 px-3 py-2 text-[13px] font-semibold text-red-400 transition-all hover:bg-red-400/[0.18] active:translate-y-px"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>
      ) : (
        <div className="flex w-[200px] flex-shrink-0 flex-col justify-center gap-2 border-l border-white/[0.06] pl-4">
          {demand.faculty_note && (
            <div className="flex items-start gap-2 text-[12.5px] italic leading-relaxed text-[#9a9aa6]">
              {demand.status === "approved" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 opacity-80">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 opacity-80">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              )}
              <span>{demand.faculty_note}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function DemandsPage() {
  const { user, userRole } = useAuth();
  const isFaculty = userRole === "faculty" || userRole === "admin";

  // Core state
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Student raise-demand modal
  const [showRaise, setShowRaise] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("IoT Devices");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Optimistic voting
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());

  // Faculty action modal
  const [actionModal, setActionModal] = useState<{ type: "approve" | "reject"; demand: Demand } | null>(null);
  const [facultyNote, setFacultyNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const setupRef = useRef(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchDemands = useCallback(async () => {
    try {
      const [demandsRes, votesRes] = await Promise.all([
        supabase.from("demands").select("*").order("created_at", { ascending: false }),
        supabase.from("demand_votes").select("demand_id, student_id"),
      ]);

      if (demandsRes.error) {
        if ((demandsRes.error as { code?: string }).code === "42P01") {
          setDbReady(false);
        } else {
          toast.error("Failed to load demands");
        }
        setLoading(false);
        return;
      }

      const votes = votesRes.data ?? [];
      const merged: Demand[] = (demandsRes.data ?? []).map((d) => ({
        ...(d as Omit<Demand, "vote_count" | "user_voted">),
        vote_count: votes.filter((v) => v.demand_id === d.id).length,
        user_voted: votes.some((v) => v.demand_id === d.id && v.student_id === user?.id),
      }));

      setDemands(merged);
      setDbReady(true);
      setLoading(false);
    } catch {
      toast.error("Failed to load demands");
      setLoading(false);
    }
  }, [user?.id]);

  // ── DB setup (once on mount) ──────────────────────────────────────────────

  useEffect(() => {
    if (setupRef.current) return;
    setupRef.current = true;
    (async () => { try { await supabase.rpc("setup_demands"); } catch { } })();
  }, []);

  // ── Initial + reactive fetch ──────────────────────────────────────────────

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  // ── Real-time subscription ────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel("demands-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "demands" }, fetchDemands)
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_votes" }, fetchDemands)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDemands]);

  // ── Vote handler (optimistic) ─────────────────────────────────────────────

  const handleVote = useCallback(async (demand: Demand) => {
    if (votingIds.has(demand.id) || demand.user_voted) return;

    setVotingIds((prev) => new Set(prev).add(demand.id));
    setDemands((prev) =>
      prev.map((d) =>
        d.id === demand.id ? { ...d, vote_count: d.vote_count + 1, user_voted: true } : d
      )
    );

    try {
      const { error } = await supabase
        .from("demand_votes")
        .insert({ demand_id: demand.id, student_id: user?.id });

      if (error) {
        // Silently revert (handles unique constraint violation too)
        setDemands((prev) =>
          prev.map((d) =>
            d.id === demand.id ? { ...d, vote_count: d.vote_count - 1, user_voted: false } : d
          )
        );
      }
    } catch {
      setDemands((prev) =>
        prev.map((d) =>
          d.id === demand.id ? { ...d, vote_count: d.vote_count - 1, user_voted: false } : d
        )
      );
    }

    setVotingIds((prev) => {
      const next = new Set(prev);
      next.delete(demand.id);
      return next;
    });
  }, [votingIds, user?.id]);

  // ── Submit new demand ─────────────────────────────────────────────────────

  const handleSubmitDemand = async () => {
    if (!formTitle.trim() || formSubmitting) return;
    setFormSubmitting(true);

    const name =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "Unknown";

    try {
      const { error } = await supabase.from("demands").insert({
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        category: formCategory,
        created_by: user?.id,
        created_by_name: name,
        created_by_email: user?.email ?? "",
      });

      if (error) {
        toast.error("Failed to submit demand");
      } else {
        toast.success("Demand submitted!");
        setShowRaise(false);
        setFormTitle("");
        setFormDesc("");
        setFormCategory("IoT Devices");
        fetchDemands();
      }
    } catch {
      toast.error("Failed to submit demand");
    }
    setFormSubmitting(false);
  };

  // ── Faculty: mark under review ────────────────────────────────────────────

  const handleMarkReview = async (demand: Demand) => {
    try {
      const { error } = await supabase
        .from("demands")
        .update({ status: "under_review", updated_at: new Date().toISOString() })
        .eq("id", demand.id);

      if (error) {
        toast.error("Failed to update status");
      } else {
        toast.success("Marked as Under Review");
        fetchDemands();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  // ── Faculty: approve / reject ─────────────────────────────────────────────

  const handleActionSubmit = async () => {
    if (!actionModal || actionSubmitting) return;
    if (actionModal.type === "reject" && !facultyNote.trim()) return;
    setActionSubmitting(true);

    try {
      const { error } = await supabase
        .from("demands")
        .update({
          status: actionModal.type === "approve" ? "approved" : "rejected",
          faculty_note: facultyNote.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionModal.demand.id);

      if (error) {
        toast.error("Failed to update demand");
      } else {
        toast.success(actionModal.type === "approve" ? "Demand approved" : "Demand rejected");
        setActionModal(null);
        setFacultyNote("");
        fetchDemands();
      }
    } catch {
      toast.error("Failed to update demand");
    }
    setActionSubmitting(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = demands.filter((d) => filter === "all" || d.status === filter);

  const counts = {
    all: demands.length,
    pending: demands.filter((d) => d.status === "pending").length,
    under_review: demands.filter((d) => d.status === "under_review").length,
    approved: demands.filter((d) => d.status === "approved").length,
    rejected: demands.filter((d) => d.status === "rejected").length,
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "under_review", label: "Under Review" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (!user) return <div className="p-8 text-white">Loading...</div>;

  // ── "Setting up..." screen ────────────────────────────────────────────────

  if (!dbReady) {
    return (
      <AppShell title="Demand Board">
        <div className="flex flex-col items-center justify-center gap-3 py-40 text-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm font-medium text-white/60">Setting up Demand Board…</p>
          <p className="text-xs text-white/30">Run the database migration to enable this feature.</p>
        </div>
      </AppShell>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Demand Board">
      <div className="mx-auto max-w-[960px] px-6 pb-24 pt-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-gradient-to-b from-violet-500 to-violet-700 shadow-[0_10px_24px_-10px_rgba(124,58,237,0.7),inset_0_0_0_1px_rgba(255,255,255,0.12)]">
              <Megaphone className="h-5 w-5 text-white" />
            </span>
            <div>
              <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-white">
                Demand Board
              </h1>
              <p className="mt-1.5 text-sm text-[#9a9aa6]">
                {isFaculty
                  ? "Review and action student equipment requests"
                  : "Vote for equipment and features you want in IdeaLab"}
              </p>
            </div>
          </div>

          {isFaculty ? (
            <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/[0.16] px-3 py-1.5 text-[11.5px] font-semibold text-violet-400">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
              </svg>
              Faculty View
            </span>
          ) : (
            <button
              onClick={() => setShowRaise(true)}
              className="inline-flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_12px_26px_-12px_rgba(124,58,237,0.7),0_0_0_1px_rgba(124,58,237,0.35)] transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <Plus className="h-4 w-4" />
              Raise a Demand
            </button>
          )}
        </div>

        {/* Faculty stats row */}
        {isFaculty && (
          <div className="mb-6 grid grid-cols-5 gap-3">
            {[
              { label: "Total Demands",  value: counts.all,          numCls: "text-white",         dotCls: "bg-violet-400" },
              { label: "Pending",        value: counts.pending,      numCls: "text-amber-400",     dotCls: "bg-amber-400" },
              { label: "Under Review",   value: counts.under_review, numCls: "text-blue-400",      dotCls: "bg-blue-400" },
              { label: "Approved",       value: counts.approved,     numCls: "text-green-400",     dotCls: "bg-green-400" },
              { label: "Rejected",       value: counts.rejected,     numCls: "text-red-400",       dotCls: "bg-red-400" },
            ].map(({ label, value, numCls, dotCls }) => (
              <div key={label} className="rounded-[13px] border border-white/10 bg-[#111114] px-4 py-3.5">
                <div className={`text-2xl font-extrabold tabular-nums leading-none ${numCls}`}>{value}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9a9aa6]">
                  <span className={`h-[7px] w-[7px] rounded-full ${dotCls}`} />
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-all ${
                filter === key
                  ? "border-transparent bg-[#7c3aed] text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                  : "border-white/10 bg-transparent text-[#9a9aa6] hover:border-white/20 hover:text-white"
              }`}
            >
              {label}{" "}
              <span className="ml-1.5 tabular-nums opacity-70">
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Card list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-sm text-[#6e6e78]">No demands found.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filtered.map((demand) =>
              isFaculty ? (
                <FacultyCard
                  key={demand.id}
                  demand={demand}
                  onMarkReview={handleMarkReview}
                  onOpenAction={(type, d) => {
                    setActionModal({ type, demand: d });
                    setFacultyNote("");
                  }}
                />
              ) : (
                <StudentCard
                  key={demand.id}
                  demand={demand}
                  userId={user?.id}
                  onVote={handleVote}
                  voting={votingIds.has(demand.id)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* ── Student: Raise a Demand modal ─────────────────────────────── */}
      {showRaise && (
        <Modal onBackdropClick={() => setShowRaise(false)}>
          <div className="w-full max-w-[480px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white">Raise a Demand</h2>
              <CloseBtn onClick={() => setShowRaise(false)} />
            </div>
            <p className="mb-5 text-[13px] text-[#9a9aa6]">
              Tell us what equipment or feature would make IdeaLab better.
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                Title <span className="text-violet-400">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Soldering stations for the electronics bench"
                className="w-full rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                Description{" "}
                <span className="font-normal text-[#6e6e78]">(optional)</span>
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Why is this needed? How many units? Which courses or projects would use it?"
                rows={3}
                className="w-full resize-none rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] leading-relaxed text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
              />
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                Category
              </label>
              <div className="relative">
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full appearance-none rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] text-white outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa6]" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRaise(false)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDemand}
                disabled={!formTitle.trim() || formSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {formSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
                Submit Demand
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Faculty: Approve / Reject modal ───────────────────────────── */}
      {actionModal && (
        <Modal onBackdropClick={() => { setActionModal(null); setFacultyNote(""); }}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white">
                {actionModal.type === "approve" ? "Approve Demand" : "Reject Demand"}
              </h2>
              <CloseBtn onClick={() => { setActionModal(null); setFacultyNote(""); }} />
            </div>
            <p className="mb-5 truncate text-[13px] text-[#9a9aa6]">
              "{actionModal.demand.title}"
            </p>

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                Note{" "}
                {actionModal.type === "reject" ? (
                  <span className="text-violet-400">*</span>
                ) : (
                  <span className="font-normal text-[#6e6e78]">(optional)</span>
                )}
              </label>
              <textarea
                value={facultyNote}
                onChange={(e) => setFacultyNote(e.target.value)}
                placeholder={
                  actionModal.type === "approve"
                    ? "Any notes for students about this approval…"
                    : "Reason for rejection (required)"
                }
                rows={3}
                className="w-full resize-none rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] leading-relaxed text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setActionModal(null); setFacultyNote(""); }}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={
                  actionSubmitting ||
                  (actionModal.type === "reject" && !facultyNote.trim())
                }
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white transition disabled:opacity-50 ${
                  actionModal.type === "approve"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {actionSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {actionModal.type === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
