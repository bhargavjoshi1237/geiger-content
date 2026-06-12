"use client";

import { forwardRef } from "react";
import Link from "next/link";
import Logo from "@/components/ui/logo";
import { ArrowRight, Zap, Layers, Cpu, ContainerIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NavLink = forwardRef(function NavLink(
  { internalLink = false, href, children, ...props },
  ref
) {
  if (internalLink) {
    return (
      <Link ref={ref} href={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  );
});

export function MegaMenu() {
  const products = [
    {
      icon: ContainerIcon,
      label: "Flow",
      description: "Plan and track work.",
      href: "/flow",
    },
    {
      icon: Zap,
      label: "Content",
      description: "Create and organize content.",
      href: "/home",
      internalLink: true,
    },
    {
      icon: Layers,
      label: "DAM",
      description: "Manage your media.",
      href: "#",
    },
    {
      icon: Cpu,
      label: "Grey",
      description: "AI workspace tools.",
      href: "#",
    },
  ];

  const resources = [
    { label: "Documentation", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Blog", href: "/blog" },
    { label: "GitHub Repository", href: "#" },
    { label: "Self Host Geiger", href: "#" },
  ];

  return (
    <>
      <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-sm font-medium text-muted-foreground">
        <div className="group">
          <button className="flex items-center gap-1 py-6 transition-colors hover:text-foreground">
            Features
          </button>

          <div className="invisible absolute left-1/2 top-[100%] w-[640px] -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Products</p>
                  <div className="space-y-1">
                    {products.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          href={item.href}
                          internalLink={item.internalLink}
                          key={item.label}
                           className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
                        >
                           <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-foreground">{item.label}</p>
                            <p className="text-xs text-text-secondary">{item.description}</p>
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Resources</p>
                  <div className="space-y-1">
                    {resources.map((item) => (
                      <a
                        href={item.href}
                        key={item.label}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        {item.label}
                        <ArrowRight className="h-3.5 w-3.5 text-text-secondary" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a href="/pricing" className="py-6 transition-colors hover:text-foreground">
          Pricing
        </a>
      </nav>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground hover:bg-surface-hover">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="max-h-[85dvh] overflow-y-auto border-border bg-background text-foreground">
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Logo size={18} className="text-foreground" />
                <SheetTitle className="mt-0.5">Geiger Studio</SheetTitle>
              </div>
              <SheetDescription className="text-text-secondary">
                Browse products, resources, and pricing.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Products</p>
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                  {products.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SheetClose asChild key={item.label}>
                        <NavLink
                          href={item.href}
                          internalLink={item.internalLink}
                          className="flex min-w-[86px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-2 py-3 text-center text-xs text-foreground"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <p className="leading-tight">{item.label}</p>
                        </NavLink>
                      </SheetClose>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Resources</p>
                {resources.map((item) => (
                  <SheetClose asChild key={item.label}>
                    <a
                      href={item.href}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground"
                    >
                      {item.label}
                      <ArrowRight className="h-4 w-4 text-text-secondary" />
                    </a>
                  </SheetClose>
                ))}
              </div>

              <div className="space-y-2">
                <SheetClose asChild>
                  <a
                    href="/pricing"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    View Pricing
                  </a>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    href="/home"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground"
                  >
                    Open Content
                  </Link>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
