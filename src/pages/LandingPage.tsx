import { useEffect } from "react";
import { LandingNav } from "../components/landing/LandingNav";
import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { CTASection } from "../components/landing/CTASection";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function LandingPage() {

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


      <CTASection />
      <LandingFooter />
    </div>
  );
}
