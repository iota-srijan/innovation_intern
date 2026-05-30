import { useRef } from "react";
import { motion, useInView } from "framer-motion";

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


      </div>
    </section>
  );
}
