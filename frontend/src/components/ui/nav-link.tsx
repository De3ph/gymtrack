"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { linkStyles } from "@/components/layout/dashboard-styles";

type ActiveMatch = "exact" | "endsWith" | "includes";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  activeMatch?: ActiveMatch;
  className?: string;
}

export function NavLink({ href, children, activeMatch = "exact", className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = matchPath(pathname, href, activeMatch);
  
  return (
    <Link
      href={href}
      className={cn(linkStyles.nav, isActive && "bg-gray-200 dark:bg-gray-700", className)}
    >
      {children}
    </Link>
  );
}

function matchPath(pathname: string, href: string, mode: ActiveMatch): boolean {
  switch (mode) {
    case "exact": return pathname === href;
    case "endsWith": return pathname.endsWith(href);
    case "includes": return pathname.includes(href);
    default: return false;
  }
}