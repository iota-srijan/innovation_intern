import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LandingNav } from "../components/landing/LandingNav";
import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { CTASection } from "../components/landing/CTASection";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function LandingPage() {
  const navigate = useNavigate();

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

      {/* IdeaLab CTA Section — replaces the pricing section */}
      <section id="idealab" className="border-t border-white/6 py-24 px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="text-xs uppercase tracking-widest text-violet-500 font-semibold mb-3">
              OPJU IdeaLab
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Built for OPJU IdeaLab
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A digital inventory system replacing the paper register. Students browse and request
              components. Faculty approve and manage stock. Real-time tracking for everyone on campus.
            </p>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/signin')}
              className="w-full py-3 bg-violet-700 hover:bg-violet-600 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Student Login
            </button>
            <button
              onClick={() => navigate('/signin')}
              className="w-full py-3 border border-zinc-700 hover:border-violet-600 hover:text-white text-zinc-300 font-medium rounded-xl text-sm transition-all cursor-pointer"
            >
              Faculty Login
            </button>
          </div>
        </div>
      </section>

      <CTASection />
      <LandingFooter />
    </div>
  );
}
