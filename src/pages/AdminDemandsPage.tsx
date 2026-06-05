import { useCallback, useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
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
  student_vote_count: number;
  faculty_vote_count: number;
  vote_count: number;
}

interface FacultyVoter {
  voter_id: string;
  email: string;
  note: string | null;
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
  "IoT Devices": "text-cyan-400 bg-cyan-400/10",
  "3D Printing": "text-orange-400 bg-orange-400/10",
  "Electronics": "text-yellow-400 bg-yellow-400/10",
  "Software":    "text-purple-400 bg-purple-400/10",
  "Other":       "text-[#9ca3af] bg-[#9ca3af]/10",
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

function DemandRef({ title }: { title: string }) {
  return (
    <div className="mb-[18px] rounded-[11px] border border-white/[0.06] bg-[#0a0a0b] px-3.5 py-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6e6e78]">Demand</div>
      <div className="text-[14px] font-semibold text-[#f4f4f6]">{title}</div>
    </div>
  );
}

// ─── Admin Demand Card ─────────────────────────────────────────────────────

function AdminDemandCard({
  demand,
  onMarkReview,
  onOpenAction,
  onDelete,
  onViewVotes,
}: {
  demand: Demand;
  onMarkReview: (d: Demand) => void;
  onOpenAction: (type: "approve" | "reject", d: Demand) => void;
  onDelete: (d: Demand) => void;
  onViewVotes: (d: Demand) => void;
}) {
  const isActionable = demand.status === "pending" || demand.status === "under_review";

  return (
    <article className="flex items-stretch gap-4 rounded-2xl border border-white/10 bg-[#111114] px-5 py-[18px] transition-colors hover:border-white/[0.16]">

      {/* Vote area — always disabled for admin with tooltip */}
      <div className="group relative flex-shrink-0">
        <div className="flex w-14 cursor-not-allowed flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[#6e6e78]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-[0.28]">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <span className="text-[17px] font-bold tabular-nums">{demand.vote_count}</span>
          <span className="text-[9.5px] font-medium uppercase tracking-[0.06em]">votes</span>
        </div>
        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[7px] border border-white/10 bg-[#16161b] px-[9px] py-[5px] text-[11px] font-medium text-[#9a9aa6] opacity-0 transition-opacity group-hover:opacity-100">
          Admins cannot vote
        </div>
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
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#6e6e78]">
            ↑ {demand.student_vote_count}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-2 py-0.5 text-[11px] font-medium text-violet-400">
            ↑ {demand.faculty_vote_count} Faculty
          </span>
        </div>

        {/* View Votes button */}
        <button
          onClick={e => { e.stopPropagation(); onViewVotes(demand); }}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-violet-500/30 bg-violet-500/[0.16] px-2.5 py-[5px] text-[12px] font-semibold text-violet-400 transition hover:bg-violet-500/25"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          View Votes
        </button>

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
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
              </svg>
              Mark Under Review
            </button>
          )}
          <button
            onClick={() => onOpenAction("approve", demand)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-green-400/40 bg-green-400/[0.14] px-3 py-2 text-[13px] font-semibold text-green-400 transition-all hover:bg-green-400/[0.22] active:translate-y-px"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Approve
          </button>
          <button
            onClick={() => onOpenAction("reject", demand)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-red-400/35 bg-red-400/10 px-3 py-2 text-[13px] font-semibold text-red-400 transition-all hover:bg-red-400/[0.18] active:translate-y-px"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
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
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 opacity-80">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              )}
              <span>{demand.faculty_note}</span>
            </div>
          )}
        </div>
      )}

      {/* Delete strip — bleeds to card edges */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(demand); }}
        aria-label="Delete demand"
        className="flex w-[38px] flex-shrink-0 -mb-[18px] -ml-4 -mr-[20px] -mt-[18px] cursor-pointer items-center justify-center rounded-r-[15px] border-l border-l-white/[0.07] bg-red-500/[0.08] text-red-400/45 transition-[background,color,border-color,box-shadow] duration-150 hover:border-l-red-500/45 hover:bg-red-500/[0.22] hover:text-red-400 hover:shadow-[inset_-4px_0_12px_rgba(239,68,68,0.12)] active:opacity-80"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </article>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminDemandsPage() {
  const { user } = useAuth();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  const [actionModal, setActionModal] = useState<{ type: "approve" | "reject"; demand: Demand } | null>(null);
  const [facultyNote, setFacultyNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Demand | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [voteBreakdown, setVoteBreakdown] = useState<{
    demand: Demand;
    facultyVoters: FacultyVoter[];
    studentCount: number;
  } | null>(null);
  const [voteBreakdownLoading, setVoteBreakdownLoading] = useState(false);

  // ── Audit helper ──────────────────────────────────────────────────────────

  const logAudit = useCallback(async (action: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const actorEmail = user?.email ?? session?.user?.email ?? null;
      await supabase.from("audit_log").insert({
        actor_email: actorEmail,
        action,
        action_type: "admin_action",
      });
    } catch { /* non-fatal */ }
  }, [user?.email]);

  // ── Fetch demands ─────────────────────────────────────────────────────────

  const fetchDemands = useCallback(async () => {
    try {
      const [demandsRes, votesRes] = await Promise.all([
        supabase.from("demands").select("*").order("created_at", { ascending: false }),
        supabase.from("demand_votes").select("demand_id, voter_role"),
      ]);

      if (demandsRes.error) {
        toast.error("Failed to load IdeaBoard");
        setLoading(false);
        return;
      }

      const votes = (votesRes.data ?? []) as Array<{ demand_id: string; voter_role: string | null }>;
      const merged: Demand[] = (demandsRes.data ?? []).map(d => ({
        ...(d as Omit<Demand, "vote_count" | "student_vote_count" | "faculty_vote_count">),
        vote_count:         votes.filter(v => v.demand_id === d.id).length,
        student_vote_count: votes.filter(v => v.demand_id === d.id && v.voter_role !== "faculty").length,
        faculty_vote_count: votes.filter(v => v.demand_id === d.id && v.voter_role === "faculty").length,
      }));

      setDemands(merged);
      setLoading(false);
    } catch {
      toast.error("Failed to load IdeaBoard");
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDemands(); }, [fetchDemands]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-demands-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "demands" }, fetchDemands)
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_votes" }, fetchDemands)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDemands]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkReview = async (demand: Demand) => {
    const { error } = await supabase
      .from("demands")
      .update({ status: "under_review", updated_at: new Date().toISOString() })
      .eq("id", demand.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Marked as Under Review");
      await logAudit(`Marked demand under review: ${demand.title}`);
      fetchDemands();
    }
  };

  const handleActionSubmit = async () => {
    if (!actionModal || actionSubmitting) return;
    if (actionModal.type === "reject" && !facultyNote.trim()) return;
    setActionSubmitting(true);

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
      const auditMsg = actionModal.type === "approve"
        ? `Approved demand: ${actionModal.demand.title}`
        : `Rejected demand: ${actionModal.demand.title}`;
      await logAudit(auditMsg);
      setActionModal(null);
      setFacultyNote("");
      fetchDemands();
    }
    setActionSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteSubmitting) return;
    setDeleteSubmitting(true);

    await supabase.from("demand_votes").delete().eq("demand_id", deleteTarget.id);
    const { error } = await supabase.from("demands").delete().eq("id", deleteTarget.id);

    if (error) {
      toast.error("Failed to delete demand");
    } else {
      toast.success("Demand deleted");
      await logAudit(`Deleted demand: ${deleteTarget.title}`);
      setDeleteTarget(null);
      fetchDemands();
    }
    setDeleteSubmitting(false);
  };

  const handleViewVotes = async (demand: Demand) => {
    setVoteBreakdown({ demand, facultyVoters: [], studentCount: 0 });
    setVoteBreakdownLoading(true);
    try {
      const { data: votesData } = await supabase
        .from("demand_votes")
        .select("*")
        .eq("demand_id", demand.id);

      const votes = (votesData ?? []) as Array<{ student_id: string; voter_role: string | null; note?: string | null }>;
      const facultyVotes = votes.filter(v => v.voter_role === "faculty");
      const studentCount = votes.filter(v => v.voter_role !== "faculty").length;
      const facultyVoterIds = facultyVotes.map(v => v.student_id);

      let facultyVoters: FacultyVoter[] = [];
      if (facultyVoterIds.length > 0) {
        const { data: usersData } = await supabase
          .from("user_roles")
          .select("user_id, email")
          .in("user_id", facultyVoterIds);

        const userMap = new Map(
          (usersData ?? []).map((u: { user_id: string; email: string }) => [u.user_id, u])
        );

        facultyVoters = facultyVotes.map(fv => {
          const u = userMap.get(fv.student_id) as { user_id: string; email: string } | undefined;
          return {
            voter_id: fv.student_id,
            email: u?.email ?? fv.student_id,
            note: (fv.note as string | null | undefined) ?? null,
          };
        });
      }

      setVoteBreakdown({ demand, facultyVoters, studentCount });
    } catch { /* silently ignore */ } finally {
      setVoteBreakdownLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = demands.filter(d => filter === "all" || d.status === filter);

  const counts = {
    all:          demands.length,
    pending:      demands.filter(d => d.status === "pending").length,
    under_review: demands.filter(d => d.status === "under_review").length,
    approved:     demands.filter(d => d.status === "approved").length,
    rejected:     demands.filter(d => d.status === "rejected").length,
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all",          label: "All" },
    { key: "pending",      label: "Pending" },
    { key: "under_review", label: "Under Review" },
    { key: "approved",     label: "Approved" },
    { key: "rejected",     label: "Rejected" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="IdeaBoard">
      <div className="mx-auto max-w-[960px] px-6 pb-24 pt-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-gradient-to-b from-violet-500 to-violet-700 shadow-[0_10px_24px_-10px_rgba(124,58,237,0.7),inset_0_0_0_1px_rgba(255,255,255,0.12)]">
              <Megaphone className="h-5 w-5 text-white" />
            </span>
            <div>
              <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-white">
                IdeaBoard
              </h1>
              <p className="mt-1.5 text-sm text-[#9a9aa6]">Your queries and equipment requests — addressed here</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/[0.16] px-3 py-1.5 text-[11.5px] font-semibold text-violet-400">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
            </svg>
            Admin View
          </span>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-5 gap-3">
          {[
            { label: "Total IdeaBoard",  value: counts.all,          numCls: "text-white",       dotCls: "bg-violet-400" },
            { label: "Pending",        value: counts.pending,      numCls: "text-amber-400",   dotCls: "bg-amber-400" },
            { label: "Under Review",   value: counts.under_review, numCls: "text-blue-400",    dotCls: "bg-blue-400" },
            { label: "Approved",       value: counts.approved,     numCls: "text-green-400",   dotCls: "bg-green-400" },
            { label: "Rejected",       value: counts.rejected,     numCls: "text-red-400",     dotCls: "bg-red-400" },
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
              <span className="ml-1.5 tabular-nums opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>

        {/* Card list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-sm text-[#6e6e78]">No IdeaBoard found.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filtered.map(demand => (
              <AdminDemandCard
                key={demand.id}
                demand={demand}
                onMarkReview={handleMarkReview}
                onOpenAction={(type, d) => { setActionModal({ type, demand: d }); setFacultyNote(""); }}
                onDelete={setDeleteTarget}
                onViewVotes={handleViewVotes}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Approve / Reject modal ─────────────────────────────────────── */}
      {actionModal && (
        <Modal onBackdropClick={() => { setActionModal(null); setFacultyNote(""); }}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-[11px]">
                <span className={`grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[10px] ${
                  actionModal.type === "approve" ? "bg-green-400/[0.12] text-green-400" : "bg-red-400/[0.12] text-red-400"
                }`}>
                  {actionModal.type === "approve" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  )}
                </span>
                <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white">
                  {actionModal.type === "approve" ? "Approve Demand" : "Reject Demand"}
                </h2>
              </div>
              <CloseBtn onClick={() => { setActionModal(null); setFacultyNote(""); }} />
            </div>

            <DemandRef title={actionModal.demand.title} />

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                {actionModal.type === "approve" ? (
                  <>Add a note for students <span className="font-normal text-[#6e6e78]">(optional)</span></>
                ) : (
                  <>Reason for rejection <span className="text-red-400">*</span></>
                )}
              </label>
              <textarea
                value={facultyNote}
                onChange={e => setFacultyNote(e.target.value)}
                placeholder={
                  actionModal.type === "approve"
                    ? "e.g. Approved — procurement order placed, expected in 3–4 weeks."
                    : "Explain why this demand can't be approved — students will see this."
                }
                rows={3}
                className={`w-full resize-none rounded-[11px] border bg-[#0a0a0b] px-3 py-[11px] text-[14px] leading-relaxed text-white placeholder-[#6e6e78] outline-none transition ${
                  actionModal.type === "approve"
                    ? "border-white/10 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                    : "border-white/10 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]"
                }`}
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
                disabled={actionSubmitting || (actionModal.type === "reject" && !facultyNote.trim())}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white transition disabled:opacity-50 ${
                  actionModal.type === "approve"
                    ? "bg-gradient-to-b from-green-400 to-green-600 shadow-[0_10px_24px_-12px_rgba(74,222,128,0.7)] hover:brightness-105"
                    : "bg-gradient-to-b from-red-400 to-red-600 shadow-[0_10px_24px_-12px_rgba(248,113,113,0.7)] hover:brightness-105"
                }`}
              >
                {actionSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {actionModal.type === "approve" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                )}
                {actionModal.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Demand modal ────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal onBackdropClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-[11px]">
                <span className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[10px] bg-red-400/[0.12] text-red-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </span>
                <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white">Delete Demand?</h2>
              </div>
              <CloseBtn onClick={() => setDeleteTarget(null)} />
            </div>

            <DemandRef title={deleteTarget.title} />

            <p className="mb-6 text-[13.5px] leading-relaxed text-[#9a9aa6]">
              This will permanently remove this demand and all its votes. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-red-400 to-red-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(248,113,113,0.7)] transition hover:brightness-105 disabled:opacity-50"
              >
                {deleteSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Vote Breakdown modal ───────────────────────────────────────── */}
      {voteBreakdown && (
        <Modal onBackdropClick={() => setVoteBreakdown(null)}>
          <div className="w-full max-w-[500px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-[11px]">
                <span className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[10px] bg-violet-500/[0.16] text-violet-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white">Vote Breakdown</h2>
              </div>
              <CloseBtn onClick={() => setVoteBreakdown(null)} />
            </div>

            <DemandRef title={voteBreakdown.demand.title} />

            {voteBreakdownLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Faculty Votes */}
                <div>
                  <div className="mb-3 flex items-center gap-[9px]">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6e6e78]">Faculty Votes</h3>
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-2 py-0.5 text-[11px] font-bold text-violet-400">
                      {voteBreakdown.facultyVoters.length}
                    </span>
                  </div>
                  {voteBreakdown.facultyVoters.length === 0 ? (
                    <p className="text-[12px] text-[#4b4b57]">No faculty votes yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {voteBreakdown.facultyVoters.map(v => (
                        <div key={v.voter_id} className="flex items-start gap-3 rounded-[11px] border border-white/[0.06] bg-[#0a0a0b] px-3.5 py-3">
                          <div className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] bg-violet-500/20 text-[12px] font-bold text-violet-400">
                            {v.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-mono text-[12.5px] font-semibold text-[#f4f4f6]">{v.email}</div>
                            <div className="mt-0.5 text-[10.5px] text-[#6e6e78]">Faculty member</div>
                            <div className={`mt-[7px] text-[12.5px] leading-relaxed ${v.note ? "italic text-[#9a9aa6]" : "text-[#6e6e78]"}`}>
                              {v.note ? `"${v.note}"` : "No note"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Votes */}
                <div>
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6e6e78]">Student Votes</h3>
                  <div className="flex items-baseline gap-2.5 rounded-[11px] border border-white/[0.06] bg-[#0a0a0b] px-5 py-4">
                    <span className="text-[36px] font-extrabold leading-none tabular-nums tracking-[-0.02em] text-violet-400">
                      {voteBreakdown.studentCount}
                    </span>
                    <span className="text-[14px] text-[#9a9aa6]">
                      {voteBreakdown.studentCount !== 1 ? "students" : "student"} voted
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setVoteBreakdown(null)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
