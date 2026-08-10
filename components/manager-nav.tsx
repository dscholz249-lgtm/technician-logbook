"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon, UsersIcon, BookOpenIcon, HelpCircleIcon,
  SettingsIcon, MenuIcon, XIcon,
} from "lucide-react";
import { RequestHelpButton } from "@/app/(manager)/manager/request-help-button";

const PRIMARY_NAV = [
  { href: "/manager", label: "Home", icon: HomeIcon, exact: true },
  { href: "/manager/technicians", label: "Technicians", icon: UsersIcon },
  { href: "/manager/logbook", label: "My Logbook", icon: BookOpenIcon },
];

const SECONDARY_NAV = [
  { href: "/manager/how-to", label: "How To", icon: HelpCircleIcon },
  { href: "/manager/settings", label: "Settings", icon: SettingsIcon },
];

interface ManagerNavProps {
  companyName: string;
  managerName: string;
  email: string;
}

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      ].join(" ")}
    >
      <Icon className={["size-4 shrink-0", active ? "text-skillcat-orange" : ""].join(" ")} />
      {label}
    </Link>
  );
}

export function ManagerNav({ companyName, managerName, email }: ManagerNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = () => setMobileOpen(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-6 border-b border-border">
        <Link href="/manager" onClick={close} className="flex items-center gap-2.5">
          <img src="/images/skillcat-labs-logo.png" alt="SkillCat Labs" className="h-6 w-auto" />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {PRIMARY_NAV.map(item => (
          <NavLink key={item.href} {...item} onClick={close} />
        ))}

        <div className="pt-4 mt-4 border-t border-border space-y-0.5">
          {SECONDARY_NAV.map(item => (
            <NavLink key={item.href} {...item} onClick={close} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <div>
          <p className="text-xs font-medium text-foreground truncate">{companyName} · {managerName}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
        </div>
        <div className="flex items-center justify-between">
          <RequestHelpButton />
          <form action="/auth/sign-out" method="POST">
            <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 size-10 flex items-center justify-center rounded-lg bg-card border border-border"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={close}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col">
            {sidebar}
          </aside>
        </>
      )}
    </>
  );
}
