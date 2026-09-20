import Link from "next/link";

const links = [
  { href: "/home", label: "时光" },
  { href: "/suggestions", label: "建议" },
  { href: "/plans", label: "约会", badgeKey: "plans" as const },
  { href: "/settings", label: "我们" },
];

export function AppNav({
  current,
  openPlanCount = 0,
}: {
  current?: string;
  openPlanCount?: number;
}) {
  return (
    <nav className="app-nav" aria-label="主导航">
      {links.map((link) => {
        const showBadge = link.badgeKey === "plans" && openPlanCount > 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={current === link.href ? "active" : undefined}
          >
            <span className="nav-label">
              {link.label}
              {showBadge ? <span className="nav-badge">{openPlanCount}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
