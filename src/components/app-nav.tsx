import Link from "next/link";

const links = [
  { href: "/home", label: "时光" },
  { href: "/suggestions", label: "建议" },
  { href: "/plans", label: "约会" },
  { href: "/settings", label: "我们" },
];

export function AppNav({ current }: { current?: string }) {
  return (
    <nav className="app-nav" aria-label="主导航">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={current === link.href ? "active" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
