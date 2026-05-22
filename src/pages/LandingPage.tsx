import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle, X } from "lucide-react";
import { LandingNav } from "../components/landing/LandingNav";
import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { CTASection } from "../components/landing/CTASection";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function LandingPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  
  // Modal states
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', teamSize: '', useCase: '' });
  const [error, setError] = useState(false);

  // Dark background only on landing page
  useEffect(() => {
    document.documentElement.classList.add("landing-dark");
    return () => document.documentElement.classList.remove("landing-dark");
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] font-sans text-white">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />

      {/* Pricing section */}
      <section id="pricing" className="border-t border-white/6 py-24 px-8 max-w-6xl mx-auto">
        <div className="text-xs uppercase tracking-widest text-violet-500 font-semibold text-center mb-3">
          Pricing
        </div>
        <h2 className="text-4xl font-bold text-white text-center mb-3 tracking-tight">
          Simple, honest pricing.
        </h2>
        <p className="text-zinc-400 text-center text-sm mb-14">
          Start free. Upgrade when your ops demand it. No surprise fees.
        </p>

        {/* Toggle pill above cards */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-full p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`${
                billing === "monthly"
                  ? "bg-violet-700 text-white rounded-full px-4 py-1 text-xs font-medium"
                  : "text-zinc-500 px-4 py-1 text-xs cursor-pointer"
              } transition-all`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`${
                billing === "yearly"
                  ? "bg-violet-700 text-white rounded-full px-4 py-1 text-xs font-medium"
                  : "text-zinc-500 px-4 py-1 text-xs cursor-pointer"
              } transition-all`}
            >
              Yearly
            </button>
          </div>
          {billing === "yearly" && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
              Save 20%
            </span>
          )}
        </div>

        {/* 3-col card grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Card 1 — Free */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-400 mb-2">Free</div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-zinc-500 text-sm">/mo</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1 mb-6">
                For individuals and small teams getting started
              </div>
              <div className="border-t border-zinc-800 mb-6" />
              <ul className="space-y-3">
                {[
                  "Up to 100 SKUs",
                  "1 warehouse location",
                  "Basic inventory table",
                  "Low-stock visual alerts",
                  "Manual reorder tracking",
                  "CSV export (100 rows max)",
                  "1 user seat",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => navigate('/signin?plan=free')}
              className="mt-8 w-full py-2.5 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:border-violet-600 hover:text-white transition-all duration-200"
            >
              Get started free
            </button>
          </div>

          {/* Card 2 — Pro (featured) */}
          <div className="bg-violet-700 border border-violet-500 rounded-2xl p-8 relative flex flex-col justify-between">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-violet-700 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
              Most popular
            </div>
            <div>
              <div className="text-sm font-medium text-violet-200 mb-2">Pro</div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">
                  {billing === "monthly" ? "$29" : "$23"}
                </span>
                <span className="text-violet-300 text-sm">/mo</span>
              </div>
              <div className="text-xs text-violet-300 mt-1 mb-6">
                For growing ops teams that need full visibility
              </div>
              <div className="border-t border-violet-500 mb-6" />
              <ul className="space-y-3">
                {[
                  "Everything in Free",
                  "Unlimited SKUs",
                  "Up to 4 warehouse locations",
                  "Real-time Supabase sync",
                  "Spend by Category analytics",
                  "Invoice & discount trend charts",
                  "Priority restock queue",
                  "Supplier performance tracking",
                  "Email low-stock notifications",
                  "CSV + PDF export (unlimited)",
                  "5 user seats",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white">
                    <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => navigate('/signin?plan=pro')}
              className="mt-8 w-full py-2.5 bg-white text-violet-700 font-semibold rounded-xl text-sm hover:bg-violet-50 transition-colors"
            >
              Start Pro free for 30 days
            </button>
          </div>

          {/* Card 3 — Enterprise */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-400 mb-2">Enterprise</div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">Custom</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1 mb-6">
                For large teams with complex procurement workflows
              </div>
              <div className="border-t border-zinc-800 mb-6" />
              <ul className="space-y-3">
                {[
                  "Everything in Pro",
                  "Unlimited warehouses",
                  "SSO & SAML authentication",
                  "Role-based access controls",
                  "Audit logs & compliance exports",
                  "Custom ERP integrations",
                  "Dedicated onboarding manager",
                  "99.9% uptime SLA",
                  "Unlimited seats",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSalesModalOpen(true);
              }}
              className="mt-8 w-full py-2.5 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:border-violet-600 hover:text-white transition-all"
            >
              Talk to sales
            </button>
          </div>
        </div>

        {/* Below cards */}
        <div className="text-center mt-8 text-xs text-zinc-600">
          No credit card required · Cancel anytime · SOC 2 compliant
        </div>
      </section>

      <CTASection />
      <LandingFooter />

      {/* Talk to Sales Modal Overlay */}
      {salesModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setSalesModalOpen(false);
            setSubmitted(false);
            setError(false);
          }}
        >
          {/* Inner Card Container */}
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md relative mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer transition-colors"
              onClick={() => {
                setSalesModalOpen(false);
                setSubmitted(false);
                setError(false);
              }}
            >
              <X className="w-4 h-4" />
            </button>

            {!submitted ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name.trim() || !form.company.trim() || !form.teamSize || !form.useCase.trim()) {
                    setError(true);
                  } else {
                    setError(false);
                    setSubmitted(true);
                  }
                }}
              >
                <h3 className="text-xl font-semibold text-white mb-1">Talk to our sales team</h3>
                <p className="text-sm text-zinc-400 mb-6">We'll reach out within 24 hours.</p>
                
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name" 
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 w-full focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  
                  <input 
                    type="text" 
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Company name" 
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 w-full focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  
                  <select 
                    value={form.teamSize}
                    onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                    className={`bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:border-violet-500 transition-colors cursor-pointer ${!form.teamSize ? "text-zinc-500" : "text-white"}`}
                  >
                    <option value="" disabled>Team size</option>
                    <option value="1–10">1–10</option>
                    <option value="11–50">11–50</option>
                    <option value="51–200">51–200</option>
                    <option value="200+">200+</option>
                  </select>
                  
                  <textarea 
                    value={form.useCase}
                    onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                    placeholder="Describe your inventory operation…" 
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 w-full focus:outline-none focus:border-violet-500 transition-colors h-24 resize-none"
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-violet-700 hover:bg-violet-600 text-white font-medium rounded-xl text-sm mt-5 transition-colors cursor-pointer"
                >
                  Send message
                </button>
                
                {error && (
                  <p className="text-xs text-red-400 mt-2 text-center">Please fill in all fields.</p>
                )}
              </form>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Message sent!</h3>
                <p className="text-sm text-zinc-400 mb-6">Our team will contact you within 24 hours.</p>
                
                <button 
                  onClick={() => {
                    setSalesModalOpen(false);
                    setSubmitted(false);
                    setError(false);
                    setForm({ name: '', company: '', teamSize: '', useCase: '' });
                  }}
                  className="w-full py-2.5 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:border-violet-500 hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
