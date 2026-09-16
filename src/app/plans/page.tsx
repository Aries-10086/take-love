import { redirect } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AppNav } from "@/components/app-nav";
import { CompletePlanPanel } from "@/components/complete-plan";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const plans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId },
    orderBy: { createdAt: "desc" },
  });

  const openPlans = plans.filter((p) => p.status === "proposed");
  const donePlans = plans.filter((p) => p.status !== "proposed");

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>约会</span>
          </p>
          <h1>下次一起做</h1>
          <p className="lede">采纳建议后会出现在这里。完成后会回流成新的时刻。</p>
        </div>
      </div>

      {openPlans.length === 0 ? (
        <div className="empty">还没有待办约会。去建议页选一条「就这个」吧。</div>
      ) : (
        <section className="panel">
          {openPlans.map((plan) => (
            <article key={plan.id} className="suggestion-card">
              <h2>{plan.title}</h2>
              <p>{plan.detail}</p>
              <div className="meta-line">
                {plan.duration ? <span>时长 {plan.duration}</span> : null}
                {plan.budget ? <span>预算 {plan.budget}</span> : null}
                <span>
                  创建于{" "}
                  {format(plan.createdAt, "M月d日 HH:mm", { locale: zhCN })}
                </span>
              </div>
              <CompletePlanPanel planId={plan.id} />
            </article>
          ))}
        </section>
      )}

      {donePlans.length > 0 ? (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 className="brand" style={{ fontSize: "1.2rem" }}>
            已经走过
          </h2>
          {donePlans.map((plan) => (
            <article key={plan.id} className="moment-item">
              <header className="moment-meta">
                <span>{plan.status === "completed" ? "已完成" : "已取消"}</span>
                <time>
                  {format(plan.updatedAt, "M月d日 HH:mm", { locale: zhCN })}
                </time>
              </header>
              <p className="moment-content">{plan.title}</p>
            </article>
          ))}
        </section>
      ) : null}

      <AppNav current="/plans" />
    </main>
  );
}
