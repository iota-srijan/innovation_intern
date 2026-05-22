import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { useUserType } from "../../context/UserTypeContext";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as any } },
};

// Mini dashboard preview cells
const statCells = [
  { label: "Total SKUs", value: "12,847", delta: "+3.2%", positive: true },
  { label: "Low Stock", value: "34", delta: "Needs action", positive: false, alert: true },
  { label: "Open POs", value: "128", delta: "$2.4M value", positive: true },
  { label: "Fulfillment", value: "98.1%", delta: "+0.4%", positive: true },
];

const tableRows = [
  { id: "SKU-992", name: "MacBook Pro M3 Max", qty: 12, status: "Critical" },
  { id: "SKU-104", name: "Dell UltraSharp 32\"", qty: 45, status: "Low" },
  { id: "SKU-223", name: "Sony WH-1000XM5", qty: 182, status: "Healthy" },
  { id: "SKU-445", name: "Logitech MX Master 3S", qty: 89, status: "Low" },
];

function MiniDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] as any }}
      className="relative mx-auto w-full max-w-4xl"
    >
      {/* Glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-indigo-600/20 via-transparent to-transparent" />
      <div className="absolute inset-0 rounded-2xl bg-indigo-600/5 blur-3xl" />

      {/* Window chrome */}
      <div className="relative rounded-2xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/60 overflow-hidden">
        {/* Titlebar */}
        <div className="flex h-10 items-center gap-2 border-b border-white/8 px-4">
          <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
          <div className="h-3 w-3 rounded-full bg-[#28C840]" />
          <div className="mx-auto flex h-6 w-64 items-center justify-center rounded bg-white/5 text-[11px] text-white/30">
            stockpilot.app/dashboard
          </div>
        </div>

        <div className="flex h-[460px]">
          {/* Sidebar */}
          <div className="hidden w-[180px] flex-col border-r border-white/8 bg-[#0d0d0f] sm:flex">
            <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
              <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                  <polygon points="8,2 14,5.5 8,9 2,5.5" fill="white" opacity="0.95" />
                  <polygon points="2,5.5 8,9 8,14 2,10.5" fill="white" opacity="0.65" />
                  <polygon points="14,5.5 8,9 8,14 14,10.5" fill="white" opacity="0.45" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white/80">StockPilot</span>
            </div>
            <div className="flex-1 space-y-0.5 p-2 pt-3">
              {["Dashboard", "Inventory", "Suppliers", "Purchase Orders"].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] font-medium ${
                    i === 0 ? "bg-white/10 text-white" : "text-white/40"
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-indigo-400" : "bg-white/20"}`} />
                  {item}
                </div>
              ))}
              <div className="mt-4 px-2.5 text-[9px] font-semibold uppercase tracking-widest text-white/25">
                Saved Filters
              </div>
              {["Low Stock Alert", "Pending POs"].map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] font-medium text-white/40"
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-red-500" : "bg-amber-500"}`} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden p-4">
            {/* Stat cards */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statCells.map((cell, i) => (
                <motion.div
                  key={cell.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.08, duration: 0.4 }}
                  className={`rounded-lg border p-3 ${
                    cell.alert
                      ? "border-red-500/30 bg-red-950/20"
                      : "border-white/8 bg-white/4"
                  }`}
                >
                  <div className="mb-1 text-[10px] text-white/40">{cell.label}</div>
                  <div className={`text-[16px] font-bold leading-none ${cell.alert ? "text-red-400" : "text-white"}`}>
                    {cell.value}
                  </div>
                  <div className={`mt-1 text-[9px] ${cell.positive && !cell.alert ? "text-emerald-400" : cell.alert ? "text-red-400/70" : "text-white/30"}`}>
                    {cell.delta}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Chart placeholder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mb-4 rounded-lg border border-white/8 bg-white/4 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/70">Inventory Movement</span>
                <div className="flex gap-1">
                  {["30D", "90D", "1Y"].map((r, i) => (
                    <span
                      key={r}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                        i === 0 ? "bg-white/10 text-white" : "text-white/30"
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              {/* SVG chart */}
              <svg viewBox="0 0 400 64" className="w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 C40,48 60,20 100,22 C140,24 160,38 200,30 C240,22 260,10 300,14 C340,18 370,8 400,4 L400,64 L0,64 Z"
                  fill="url(#areaGrad)"
                />
                <path
                  d="M0,50 C40,48 60,20 100,22 C140,24 160,38 200,30 C240,22 260,10 300,14 C340,18 370,8 400,4"
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>

            {/* Table */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.35, duration: 0.5 }}
              className="rounded-lg border border-white/8 bg-white/4 overflow-hidden"
            >
              <div className="border-b border-white/8 px-3 py-2">
                <span className="text-[11px] font-semibold text-white/70">Priority Restock Queue</span>
              </div>
              <div className="divide-y divide-white/5">
                {tableRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-white/30">{row.id}</span>
                      <span className="text-[10px] text-white/70">{row.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/50">Qty: {row.qty}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${
                          row.status === "Critical"
                            ? "bg-red-500/20 text-red-400"
                            : row.status === "Low"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  const navigate = useNavigate();
  const { setUserType } = useUserType();

  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Top center glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/12 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6 inline-flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
              </span>
              Now in public beta — free for 30 days
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="mb-5 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Inventory operations,{" "}
            <br className="hidden sm:block" />
            <span className="text-indigo-400">engineered for clarity</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed text-white/50"
          >
            StockPilot gives operations teams real-time visibility into every SKU, purchase order, and supplier — with the precision tooling you'd expect from a developer-grade product.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <button
              onClick={() => navigate('/signin?plan=free')}
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => { setUserType('pro'); navigate('/pro-dashboard') }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:text-white"
            >
              View demo dashboard
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30"
          >
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              98.1% fulfillment accuracy
            </span>
            <span className="text-white/15">|</span>
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-indigo-400" />
              Works with any warehouse stack
            </span>
            <span className="text-white/15">|</span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              AI-powered restock alerts
            </span>
          </motion.div>
        </motion.div>

        {/* Dashboard preview */}
        <div className="mt-16 md:mt-20">
          <MiniDashboard />
        </div>
      </div>
    </section>
  );
}
