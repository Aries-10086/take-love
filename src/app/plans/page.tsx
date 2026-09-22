import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { CompletePlanPanel } from "@/components/complete-plan";
import { createPlanAction, updatePlanScheduleAction } from "@/lib/actions";
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
          <h1>我们约好了</h1>
          <p className="lede">把下次见面写进日历。做完再沉淀成时刻。</p>
        </div>
      </div>

      {openPlans.length === 0 ? (
        <div className="empty empty-craft">
          <p className="empty-title">还没有下一次见面</p>
          <p className="empty-body">挑一件小事，写进日历。不必完美，先定下来。</p>
          <div className="inline-actions" style={{ marginTop: "1rem" }}>
            <Link className="btn btn-accent" href="#add-plan">
              自己写一条
            </Link>
            <Link className="btn btn-ghost" href="/suggestions">
              从建议里挑
            </Link>
          </div>
        </div>
      ) : (
        <section className="date-card-list">
          {openPlans.map((plan) => {
            const overdue =
              plan.scheduledAt != null && plan.scheduledAt.getTime() < Date.now();
            const soon =
              plan.scheduledAt != null &&
              !overdue &&
              plan.scheduledAt.getTime() - Date.now() < 48 * 3600 * 1000;
            const kicker = overdue
              ? "该兑现了"
              : !plan.scheduledAt
                ? "还没排期"
                : soon
                  ? "快到了"
                  : "我们约好了";

            return (
              <article
                key={plan.id}
                className={`date-card${overdue ? " overdue" : ""}`}
              >
                <div className="date-rail" aria-hidden="true">
                  {plan.scheduledAt ? (
                    <>
                      <span className="date-rail-month">
                        {format(plan.scheduledAt, "M月", { locale: zhCN })}
                      </span>
                      <span className="date-rail-day">
                        {format(plan.scheduledAt, "d")}
                      </span>
                      <span className="date-rail-week">
                        {format(plan.scheduledAt, "EEE", { locale: zhCN })}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="date-rail-month">待定</span>
                      <span className="date-rail-day">?</span>
                    </>
                  )}
                </div>
                <div className="date-card-body">
                  <p className="quality-kicker">{kicker}</p>
                  <h2 className="date-card-title">{plan.title}</h2>
                  <p className="date-card-detail">{plan.detail}</p>
                  <div className="meta-line">
                    {plan.scheduledAt ? (
                      <span>
                        {format(plan.scheduledAt, "HH:mm", { locale: zhCN })}
                      </span>
                    ) : null}
                    {plan.duration ? <span>时长 {plan.duration}</span> : null}
                    {plan.budget ? <span>预算 {plan.budget}</span> : null}
                  </div>

                  <ActionForm
                    action={updatePlanScheduleAction}
                    submitLabel={plan.scheduledAt ? "改期" : "定个时间"}
                    submitClassName="btn btn-ghost"
                  >
                    <input type="hidden" name="planId" value={plan.id} />
                    <div className="field" style={{ marginBottom: "0.45rem" }}>
                      <label htmlFor={`sched-${plan.id}`}>约会时间</label>
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
                </div>
              </article>
            );
          })}
        </section>
      )}

      <details className="add-plan-details" id="add-plan">
        <summary>手动添加约会</summary>
        <div className="panel stack" style={{ marginTop: "0.85rem" }}>
          <ActionForm
            action={createPlanAction}
            submitLabel="写入日历"
            submitClassName="btn btn-primary"
          >
            <div className="field">
              <label htmlFor="title">标题</label>
              <input
                id="title"
                name="title"
                required
                placeholder="例如：周末去看展"
                maxLength={80}
              />
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
        </div>
      </details>

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
