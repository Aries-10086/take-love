import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) {
    const membership = await getMembership(session.user.id);
    redirect(membership ? "/home" : "/onboarding");
  }

  return (
    <main className="landing">
      <div className="landing-visual" aria-hidden="true">
        <div className="landing-visual-shade" />
      </div>
      <section className="landing-copy shell">
        <p className="landing-eyebrow">双人私密 · 不做广场</p>
        <h1 className="landing-brand">
          捡爱
          <span>Jian Ai</span>
        </h1>
        <p className="landing-line">
          记下相爱的时刻，把下一次见面写进日历。只有你们。
        </p>
        <div className="hero-actions landing-cta">
          <Link className="btn btn-accent" href="/register">
            创建我们的空间
          </Link>
          <Link className="btn btn-ghost" href="/register">
            我有邀请码
          </Link>
        </div>
        <p className="landing-trust">
          最多两人 · 无公开动态 · <Link href="/privacy">隐私说明</Link>
          <span className="landing-trust-sep"> · </span>
          <Link href="/login">已有账号</Link>
        </p>
      </section>
    </main>
  );
}
