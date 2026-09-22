import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <p className="brand-mark">
        捡爱 <span>404</span>
      </p>
      <h1>这里没有你们的足迹</h1>
      <p className="lede">页面不存在，或已经搬走了。回首页继续捡起爱。</p>
      <div className="inline-actions" style={{ marginTop: "1.25rem" }}>
        <Link className="btn btn-accent" href="/home">
          回首页
        </Link>
        <Link className="btn btn-ghost" href="/">
          产品页
        </Link>
      </div>
    </main>
  );
}
