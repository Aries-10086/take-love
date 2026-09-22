import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { DeleteAccountButton, LeaveSpaceButton } from "@/components/leave-space";
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

function initialOf(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : "·";
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const me = membership.space.members.find((m) => m.userId === session.user.id);
  const partner = membership.space.members.find((m) => m.userId !== session.user.id);

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
          <p className="lede">只有你们两人。纪念日、邀请、安全都在这里。</p>
        </div>
      </div>

      <section className="settings-section panel stack">
        <div className="settings-section-head">
          <h2>我们的空间</h2>
          <p className="trust-note" style={{ margin: 0 }}>
            内容仅空间内双方可见，没有公开动态。
          </p>
        </div>

        <div className="member-row">
          <div className="member-chip">
            <span className="member-avatar" aria-hidden="true">
              {initialOf(me?.user.name ?? session.user.name ?? "我")}
            </span>
            <div>
              <strong>{me?.user.name ?? session.user.name}</strong>
              <span>你 · {format(me?.joinedAt ?? membership.space.createdAt, "yyyy年M月加入", { locale: zhCN })}</span>
            </div>
          </div>
          <div className={`member-chip${partner ? "" : " waiting"}`}>
            <span className="member-avatar" aria-hidden="true">
              {partner ? initialOf(partner.user.name) : "?"}
            </span>
            <div>
              <strong>{partner ? partner.user.name : "等待加入"}</strong>
              <span>
                {partner
                  ? format(partner.joinedAt, "yyyy年M月加入", { locale: zhCN })
                  : "把邀请发给另一半"}
              </span>
            </div>
          </div>
        </div>

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
            <div className="choice-row" role="radiogroup" aria-label="约会预算偏好">
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
      </section>

      <section className="settings-section panel stack">
        <div className="settings-section-head">
          <h2>邀请另一半</h2>
          <p className="trust-note" style={{ margin: 0 }}>
            最多两人。对方通过邀请码或链接加入。
          </p>
        </div>
        <p className="invite-code">{membership.space.inviteCode}</p>
        <CopyInviteButton
          code={membership.space.inviteCode}
          spaceName={membership.space.name}
        />
        <ActionForm
          action={resetInviteCodeAction}
          submitLabel="重置邀请码"
          submitClassName="btn btn-ghost"
        />
      </section>

      <section className="settings-section panel stack">
        <div className="settings-section-head">
          <h2>账号与安全</h2>
          <p className="trust-note" style={{ margin: 0 }}>
            退出空间会轮换邀请码；注销会作废登录凭证。
          </p>
        </div>
        <LeaveSpaceButton />
        <form action={logoutAction}>
          <StatusSubmit label="退出登录" className="btn btn-ghost btn-block" />
        </form>
        <DeleteAccountButton />
        <p className="trust-note" style={{ textAlign: "center" }}>
          <Link href="/privacy">隐私说明</Link>
        </p>
      </section>

      <AppNav current="/settings" openPlanCount={openPlanCount} />
    </main>
  );
}
