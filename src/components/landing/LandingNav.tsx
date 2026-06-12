import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Docs", href: "#docs" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/8 bg-[#0d0a08]/90 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Left side: university logo bar + wordmark */}
        <div className="flex items-center">
          {/* OPJU IdeaLab logo bar */}
          <div className="hidden items-center lg:flex">
            <div className="flex items-center pr-[11px]">
              <img
                src="/opju-logo.png"
                alt="OPJU"
                className="block h-7 w-auto [filter:saturate(0.55)_opacity(0.72)_brightness(1.08)] transition-[filter] duration-[140ms] hover:[filter:saturate(0.8)_opacity(0.9)_brightness(1.1)]"
              />
            </div>
            <span className="h-[22px] w-px shrink-0 bg-white/10" />
            <div className="flex items-center px-[11px]">
              <img
                src="/aicte.png"
                alt="AICTE"
                className="block h-7 w-auto [filter:saturate(0.55)_opacity(0.72)_brightness(1.08)] transition-[filter] duration-[140ms] hover:[filter:saturate(0.8)_opacity(0.9)_brightness(1.1)]"
              />
            </div>
            <span className="h-[22px] w-px shrink-0 bg-white/10" />
            <div className="flex items-center px-[11px]">
              <img
                src="/idealab.png"
                alt="IdeaLab"
                className="block h-7 w-auto [filter:saturate(0.55)_opacity(0.72)_brightness(1.08)] transition-[filter] duration-[140ms] hover:[filter:saturate(0.8)_opacity(0.9)_brightness(1.1)]"
              />
            </div>
            <span className="h-[22px] w-px shrink-0 bg-white/10" />
            <div className="flex items-center px-[11px]">
              <img
                src="/jindal-steel.png"
                alt="Jindal Steel"
                className="block h-[21px] w-auto [filter:saturate(0.5)_opacity(0.7)_brightness(2.8)] transition-[filter] duration-[140ms] hover:[filter:saturate(0.7)_opacity(0.85)_brightness(3)]"
              />
            </div>
          </div>

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus-visible:outline-none lg:ml-5 lg:border-l lg:border-white/[0.12] lg:pl-5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 shadow-lg shadow-orange-500/30">
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,4 28,11 16,18 4,11" fill="white" opacity="0.95" />
                <polygon points="4,11 16,18 16,28 4,21" fill="white" opacity="0.65" />
                <polygon points="28,11 16,18 16,28 28,21" fill="white" opacity="0.45" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">StockPilot</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => navigate('/signin')}
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/signin')}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-400 hover:shadow-orange-400/30 active:scale-[0.98]"
          >
            Get started
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-white/60 hover:text-white md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/8 bg-[#0d0a08]/95 px-6 pb-6 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-1 pt-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => navigate('/signin')}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/signin')}
                  className="rounded-lg bg-orange-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Get started
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
