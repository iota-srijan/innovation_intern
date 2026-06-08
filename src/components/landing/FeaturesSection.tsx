import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BarChart2, Bell, GitBranch, Globe, Lock, Zap } from "lucide-react";

const features = [
  {
    icon: BarChart2,
    title: "Real-time inventory analytics",
    description:
      "Live dashboards that surface velocity, turnover, and restock needs across all warehouses the moment data changes.",
  },
  {
    icon: Bell,
    title: "Intelligent low-stock alerts",
    description:
      "Threshold-based alerting with AI-adjusted reorder quantities based on daily sales velocity and supplier lead time.",
  },
  {
    icon: GitBranch,
    title: "Purchase order workflow",
    description:
      "Create, track, and approve purchase orders with full audit trails. Catch delays before they become stockouts.",
  },
  {
    icon: Globe,
    title: "Multi-warehouse management",
    description:
      "Unified visibility across every warehouse location. Filter, transfer, and rebalance inventory with precision.",
  },
  {
    icon: Lock,
    title: "Role-based access controls",
    description:
      "Fine-grained permissions for operations leads, buyers, warehouse managers, and finance teams.",
  },
  {
    icon: Zap,
    title: "Instant sync across systems",
    description:
      "Native integrations with Shopify, WooCommerce, Linnworks, and custom ERPs via a webhook-first API.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as any } },
};

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-xl"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-medium text-white/50">
            Platform capabilities
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Everything ops teams need.{" "}
            <span className="text-white/40">Nothing they don't.</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-white/40">
            Built for the 23-tab spreadsheet workflow. StockPilot consolidates your entire inventory operation into a single, fast interface.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid gap-px border border-white/6 bg-white/6 rounded-2xl overflow-hidden sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group relative flex flex-col gap-4 bg-[#0d0a08] p-8 transition-colors hover:bg-[#111113]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 transition-colors group-hover:border-orange-400/30 group-hover:bg-orange-400/10">
                <feature.icon className="h-5 w-5 text-white/50 transition-colors group-hover:text-orange-300" />
              </div>
              <div>
                <h3 className="mb-2 text-[15px] font-semibold text-white">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-white/40">{feature.description}</p>
              </div>
              {/* Subtle hover border */}
              <div className="pointer-events-none absolute inset-0 rounded-none opacity-0 ring-1 ring-inset ring-orange-400/20 transition-opacity group-hover:opacity-100" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
