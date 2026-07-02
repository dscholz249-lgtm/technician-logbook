"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InboxIcon, BookOpenIcon, BuildingIcon, UsersIcon, HelpCircleIcon } from "lucide-react";

const NAV = [
  {
    label: "LOGBOOK",
    items: [
      { href: "/dashboard", label: "Requests", icon: InboxIcon, exact: true },
      { href: "/dashboard/logbook", label: "Logbook Entries", icon: BookOpenIcon },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/dashboard/companies", label: "Companies", icon: BuildingIcon },
      { href: "/dashboard/managers", label: "Field Managers", icon: UsersIcon },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/dashboard/support", label: "Support", icon: HelpCircleIcon },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col gap-6 py-6">
      {NAV.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-skillcat-orange/10 text-skillcat-orange font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
