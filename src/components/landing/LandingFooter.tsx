import { Link } from "react-router-dom";

const footerLinks = {
  Product: ["Features", "Changelog", "Roadmap", "Pricing"],
  Docs: ["API Reference", "Integrations", "Webhooks", "Status"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy", "Terms", "Security", "Cookies"],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-white/6 pb-8 pt-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-1 md:pr-8">
            <Link to="/" className="mb-4 flex items-center gap-2 focus-visible:outline-none">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <polygon points="8,2 14,5.5 8,9 2,5.5" fill="white" opacity="0.95" />
                  <polygon points="2,5.5 8,9 8,14 2,10.5" fill="white" opacity="0.65" />
                  <polygon points="14,5.5 8,9 8,14 14,10.5" fill="white" opacity="0.45" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white/80">StockPilot</span>
            </Link>
            <p className="text-xs leading-relaxed text-white/30">
              Inventory operations, engineered for clarity.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">
                {group}
              </div>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/40 transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-8 sm:flex-row">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} StockPilot Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-white/25">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
