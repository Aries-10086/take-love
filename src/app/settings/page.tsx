import { format } from "date-fns";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { LeaveSpaceButton } from "@/components/leave-space";
import { StatusSubmit } from "@/components/status-submit";
import {
  logoutAction,
  resetInviteCodeAction,
  updateSpacePrefsAction,
} from "@/lib/actions";
import { auth } from "@/lib/auth";
import { BUDGET_PREFS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/space";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const partner = membership.space.members.find((m) => m.userId !== session.user.id);
  const canReset =
    membership.role === "owner" || membership.space.createdBy === session.user.id;

  const openPlanCount = await prisma.plan.count({
    where: { spaceId: membership.spaceId, status: "proposed" },
  });

  const anniversaryValue = membership.space.anniversaryAt
    ? format(membership.space.anniversaryAt, "yyyy-MM-dd")
    : "";

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>我们</span>
          </p>
          <h1>空间与账号</h1>
          <p className="lede">纪念日、预算偏好、邀请另一半。</p>
        </div>
      </div>

      <section className="panel stack">
        <ActionForm
          action={updateSpacePrefsAction}
          submitLabel="保存设置"
          submitClassName="btn btn-primary"
        >
          <div className="field">
            <label htmlFor="name">空间名称</label>
            <input
              id="name"
              name="name"
              defaultValue={membership.space.name}
              maxLength={40}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="anniversaryAt">在一起的纪念日</label>
            <input
              id="anniversaryAt"
              name="anniversaryAt"
              type="date"
              defaultValue={anniversaryValue}
            />
            {!anniversaryValue ? (
              <p className="field-hint">
                填上之后，临近纪念日时首页会提醒你们安排一个小仪式。
              </p>
            ) : null}
          </div>
          <div className="field">
            <label>约会预算偏好</label>
            <div className="choice-row">
              {BUDGET_PREFS.map((item) => (
                <label key={item.value} className="choice">
                  <input
                    type="radio"
                    name="budgetPref"
                    value={item.value}
                    defaultChecked={
                      (membership.space.budgetPref || "any") === item.value
                    }
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        </ActionForm>

        <div>
          <p className="week-note" style={{ marginBottom: "0.35rem" }}>
            邀请码（给另一半）
          </p>
          <p className="invite-code">{membership.space.inviteCode}</p>
          <div style={{ marginTop: "0.75rem" }}>
            <CopyInviteButton
              code={membership.space.inviteCode}
              spaceName={membership.space.name}
            />
          </div>
          {canReset ? (
            <div style={{ marginTop: "0.5rem" }}>
              <ActionForm
                action={resetInviteCodeAction}
                submitLabel="重置邀请码"
                submitClassName="btn btn-ghost"
              />
            </div>
          ) : null}
        </div>

        <div>
          <p className="week-note" style={{ marginBottom: "0.35rem" }}>
            成员
          </p>
          <p style={{ margin: 0 }}>
            {session.user.name}（你）
            {partner ? ` · ${partner.user.name}` : " · 还在等待另一半加入"}
          </p>
        </div>
      </section>

      <section className="stack" style={{ marginTop: "1rem" }}>
        <LeaveSpaceButton />
        <form action={logoutAction}>
          <StatusSubmit label="退出登录" className="btn btn-ghost btn-block" />
        </form>
      </section>

      <AppNav current="/settings" openPlanCount={openPlanCount} />
    </main>
  );
}
