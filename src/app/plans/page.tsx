import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { CompletePlanPanel } from "@/components/complete-plan";
import { StatusSubmit } from "@/components/status-submit";
import { createPlanAction, generateSuggestionAction, updatePlanScheduleAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";

function toLocalInput(date: Date | null | undefined) {
  if (!date) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const plans = await prisma.plan.findMany({
    where: { spaceId: membership.spaceId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  const openPlans = plans.filter((p) => p.status === "proposed");
  const completedPlans = plans.filter((p) => p.status === "completed");
  const cancelledPlans = plans.filter((p) => p.status === "cancelled");

  const completedIds = completedPlans.map((p) => p.id);
  const linkedMoments =
    completedIds.length > 0
      ? await prisma.moment.findMany({
          where: { sourcePlanId: { in: completedIds } },
          select: { id: true, sourcePlanId: true },
        })
      : [];
  const momentByPlan = new Map(
    linkedMoments
      .filter((m) => m.sourcePlanId)
      .map((m) => [m.sourcePlanId as string, m.id]),
  );

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>约会</span>
          </p>
          <h1>下次一起做</h1>
          <p className="lede">采纳建议或自己写一条。设好时间，完成后回流成时刻。</p>
        </div>
      </div>

      <section className="panel stack" style={{ marginBottom: "1.25rem" }}>
        <h2 className="brand" style={{ margin: 0, fontSize: "1.15rem" }}>
          手动添加约会
        </h2>
        <ActionForm
          action={createPlanAction}
          submitLabel="加入待办"
          submitClassName="btn btn-primary"
        >
          <div className="field">
            <label htmlFor="title">标题</label>
            <input id="title" name="title" required placeholder="例如：周末去看展" maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="detail">怎么做</label>
            <textarea id="detail" name="detail" required placeholder="简单写一下安排" />
          </div>
          <div className="field">
            <label htmlFor="scheduledAt">计划时间（可选）</label>
            <input id="scheduledAt" name="scheduledAt" type="datetime-local" />
          </div>
        </ActionForm>
      </section>

      {openPlans.length === 0 ? (
        <div className="empty">
          还没有待办约会。去建议页选一条，或在上方自己添加。
          <div className="inline-actions" style={{ marginTop: "1rem" }}>
            <Link className="btn btn-accent" href="/suggestions">
              去选建议
            </Link>
            <form action={generateSuggestionAction}>
              <StatusSubmit
                label="直接生成"
                pendingLabel="生成中…"
                className="btn btn-ghost"
              />
            </form>
          </div>
        </div>
      ) : (
        <section className="panel">
          {openPlans.map((plan) => {
            const overdue = plan.scheduledAt && plan.scheduledAt.getTime() < Date.now();
            return (
              <article key={plan.id} className="suggestion-card">
                <h2>{plan.title}</h2>
                <p>{plan.detail}</p>
                <div className="meta-line">
                  {plan.duration ? <span>时长 {plan.duration}</span> : null}
                  {plan.budget ? <span>预算 {plan.budget}</span> : null}
                  {plan.scheduledAt ? (
                    <span className={overdue ? "chip soft" : undefined}>
                      {overdue ? "已过期 · " : "计划 "}
                      {format(plan.scheduledAt, "M月d日 HH:mm", { locale: zhCN })}
                    </span>
                  ) : (
                    <span>尚未排期</span>
                  )}
                </div>

                <ActionForm
                  action={updatePlanScheduleAction}
                  submitLabel="保存时间"
                  submitClassName="btn btn-ghost"
                >
                  <input type="hidden" name="planId" value={plan.id} />
                  <div className="field">
                    <label htmlFor={`sched-${plan.id}`}>改期 / 排期</label>
                    <input
                      id={`sched-${plan.id}`}
                      name="scheduledAt"
                      type="datetime-local"
                      defaultValue={toLocalInput(plan.scheduledAt)}
                    />
                  </div>
                </ActionForm>

                <CompletePlanPanel
                  planId={plan.id}
                  defaultHappenedAt={toLocalInput(plan.scheduledAt ?? new Date())}
                />
              </article>
            );
          })}
        </section>
      )}

      {completedPlans.length > 0 ? (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 className="brand" style={{ fontSize: "1.2rem" }}>
            已经完成
          </h2>
          {completedPlans.map((plan) => {
            const momentId = momentByPlan.get(plan.id);
            const body = (
              <>
                <header className="moment-meta">
                  <span>已沉淀到时光</span>
                  <time>
                    {format(plan.updatedAt, "M月d日 HH:mm", { locale: zhCN })}
                  </time>
                </header>
                <p className="moment-content">{plan.title}</p>
              </>
            );
            return (
              <article key={plan.id} className="moment-item">
                {momentId ? (
                  <Link href={`/moments/${momentId}`} className="moment-link">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </article>
            );
          })}
        </section>
      ) : null}

      {cancelledPlans.length > 0 ? (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 className="brand" style={{ fontSize: "1.2rem" }}>
            已取消
          </h2>
          {cancelledPlans.map((plan) => (
            <article key={plan.id} className="moment-item">
              <header className="moment-meta">
                <span className="chip muted">已取消</span>
                <time>
                  {format(plan.updatedAt, "M月d日 HH:mm", { locale: zhCN })}
                </time>
              </header>
              <p className="moment-content" style={{ color: "var(--ink-soft)" }}>
                {plan.title}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <AppNav current="/plans" openPlanCount={openPlans.length} />
    </main>
  );
}
