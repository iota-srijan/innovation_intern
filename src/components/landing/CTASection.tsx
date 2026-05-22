import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MoveRight } from "lucide-react";

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<80ms", label: "Avg. API latency" },
  { value: "50K+", label: "SKUs managed daily" },
  { value: "2 min", label: "Median setup time" },
];

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="border-t border-white/6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Stats row */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-20 grid grid-cols-2 gap-6 border-b border-white/6 pb-20 sm:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="flex flex-col gap-1"
            >
              <span className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                {stat.value}
              </span>
              <span className="text-sm text-white/35">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Main CTA block */}
        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0e0e10]">
          {/* Subtle indigo accent in corner */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-[80px]" />

          <div className="relative flex flex-col items-start gap-8 p-10 md:flex-row md:items-center md:justify-between md:p-14">
            <div className="max-w-lg">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Ready to see your inventory clearly?
              </h2>
              <p className="text-[15px] leading-relaxed text-white/40">
                Start your 30-day free trial. No credit card required. No sales calls. Just access your dashboard and start managing inventory the right way.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0 md:flex-col">
              <Link
                to="/dashboard"
                className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/dashboard"
                className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white"
              >
                Explore demo
                <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
