import {
  Bell,
  CalendarClock,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

const items: NavItem[] = [
  { label: "Dashboard", href: "#dashboard", icon: LayoutDashboard },
  { label: "Bills", href: "#bills", icon: CalendarClock },
  { label: "Income", href: "#income", icon: TrendingUp },
  { label: "Subscriptions", href: "#subscriptions", icon: Repeat },
  { label: "Alerts", href: "#alerts", icon: Bell },
  { label: "Spending Later", href: "#spending-later", icon: PiggyBank },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-2 sm:px-6">
        <ul className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                className="flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
