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

  // Landing page is always dark-themed. Add both landing-dark and dark so
  // the light-mode CSS overrides (html:not(.dark) …) do not fire here.
  useEffect(() => {
    const hadDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.add("landing-dark", "dark");
    return () => {
      document.documentElement.classList.remove("landing-dark");
      if (!hadDark) document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] font-sans text-white">
      <LandingNav />
      <HeroSection />

      <FeaturesSection />
      <WorkflowSection />

      {/* OPJU IdeaLab Card */}
      <div className="mx-6 my-6">
        <div className="relative bg-[#111114] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10 grid grid-cols-2 gap-12 px-12 py-14">
            {/* LEFT */}
            <div>
              {/* Branding row */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-lg">
                  <img src="/opju-logo.png" alt="OPJU" className="h-8 w-8 object-contain" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                    O.P. Jindal University
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">
                    Raigarh · Estd. 2014
                  </span>
                </div>
                <div className="mx-1 h-8 w-px flex-shrink-0 bg-white/15" />
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                  OPJU IdeaLab
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-5xl font-black leading-tight text-white">
                Built for<br />
                <span className="text-orange-500">OPJU IdeaLab</span>
              </h2>

              {/* Subtitle */}
              <p className="mt-4 max-w-lg text-base leading-relaxed text-gray-400">
                A digital inventory system replacing the paper register. Students browse and request
                components. Faculty approve and manage stock. Real-time tracking for everyone on campus.
              </p>

              {/* Badges */}
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-400">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                  Live · 1,240 components tracked
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-400">
                  Single sign-on with university ID
                </span>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col justify-center gap-4">
              {/* Student Login */}
              <button
                onClick={() => navigate("/signin")}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-orange-500 px-8 py-5 transition-colors hover:bg-orange-600"
              >
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold text-white">Student Login</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-widest text-white/60">
                    Browse · Request · Return
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  width="18"
                  height="18"
                  className="flex-shrink-0 text-white"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Faculty Login */}
              <button
                onClick={() => navigate("/signin")}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-zinc-800 border border-zinc-700 px-8 py-5 text-white transition-colors hover:bg-zinc-700"
              >
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold text-white">Faculty Login</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-widest text-white/50">
                    Approve · Manage Stock
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  width="18"
                  height="18"
                  className="flex-shrink-0 text-white"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Footer strip */}
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs uppercase tracking-widest text-gray-500">
                  An OPJU IdeaLab Initiative
                </span>
                <img src="/opju-logo.png" alt="OPJU" className="h-4 w-auto opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CTASection />
      <LandingFooter />
    </div>
  );
}
