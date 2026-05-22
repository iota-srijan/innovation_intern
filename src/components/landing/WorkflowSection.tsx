import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Connect your data sources",
    description:
      "Link your warehouse management system, ERP, or e-commerce platform in minutes via native integrations or our REST API. StockPilot begins syncing instantly.",
    detail: [
      "Shopify, WooCommerce, Linnworks",
      "Custom webhooks & REST API",
      "CSV bulk import for legacy data",
      "Real-time inventory sync",
    ],
  },
  {
    step: "02",
    title: "Define thresholds & workflows",
    description:
      "Set per-SKU reorder points, assign supplier preferences, and configure approval workflows that match how your team actually operates.",
    detail: [
      "SKU-level stock thresholds",
      "Supplier-specific lead times",
      "Multi-approval PO workflows",
      "Custom alert routing rules",
    ],
  },
  {
    step: "03",
    title: "Monitor, act, and close the loop",
    description:
      "The StockPilot dashboard surfaces exactly what needs attention. Drill into any anomaly, raise a PO, and track it through to delivery — all from one place.",
    detail: [
      "Priority restock queue",
      "One-click purchase order drafts",
      "Shipment ETA tracking",
      "Delivery confirmation & reconciliation",
    ],
  },
];

export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="workflow" className="border-t border-white/6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-xl"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-medium text-white/50">
            How it works
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            From setup to clarity{" "}
            <span className="text-white/40">in under an hour.</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-white/40">
            Most teams are fully operational within the same day they sign up. No implementation consultants. No six-week onboarding.
          </p>
        </motion.div>

        <div className="relative">
          {/* Vertical connector */}
          <div className="absolute left-[28px] top-0 hidden h-full w-px bg-white/8 md:block" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className="flex flex-col gap-6 md:flex-row md:gap-12"
              >
                {/* Step number */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#111113] text-sm font-bold text-white/40 md:mt-0">
                  {step.step}
                  <div className="absolute -bottom-12 left-1/2 hidden h-12 w-px -translate-x-1/2 bg-transparent md:block" />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-4 md:flex-row md:gap-16">
                  <div className="md:max-w-sm">
                    <h3 className="mb-2.5 text-lg font-semibold text-white">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-white/40">{step.description}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/3 p-5 md:min-w-[240px]">
                    <ul className="space-y-2.5">
                      {step.detail.map((d) => (
                        <li key={d} className="flex items-center gap-2.5 text-sm text-white/50">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
