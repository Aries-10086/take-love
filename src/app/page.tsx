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
        <h1 className="landing-brand">
          捡爱
          <span>Jian Ai</span>
        </h1>
        <p className="landing-line">记下相爱的时刻，再一起决定下一次约会。</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/register">
            开始记录
          </Link>
          <Link className="btn btn-ghost" href="/login">
            已有账号
          </Link>
        </div>
      </section>
    </main>
  );
}
