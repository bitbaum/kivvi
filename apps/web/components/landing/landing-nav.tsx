"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
}

export function LandingNav({
  links,
  signInLabel,
  demoLabel,
}: {
  links: NavLink[];
  signInLabel: string;
  demoLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden rounded-lg p-2 hover:bg-muted transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Menü schliessen" : "Menü öffnen"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b bg-background shadow-lg md:hidden">
          <nav className="container mx-auto flex flex-col px-4 py-4 gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 border-t pt-3 flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                {signInLabel}
              </Link>
              <a
                href="/#contact"
                className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => setOpen(false)}
              >
                {demoLabel}
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
