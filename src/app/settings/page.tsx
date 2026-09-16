import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AppNav } from "@/components/app-nav";
import { CopyInviteButton } from "@/components/copy-invite";
import { LeaveSpaceButton } from "@/components/leave-space";
import { StatusSubmit } from "@/components/status-submit";
import { logoutAction, resetInviteCodeAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

  const partner = membership.space.members.find((m) => m.userId !== session.user.id);
  const canReset =
    membership.role === "owner" || membership.space.createdBy === session.user.id;

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="brand-mark">
            捡爱 <span>我们</span>
          </p>
          <h1>空间与账号</h1>
          <p className="lede">邀请另一半，或暂时退出当前空间。</p>
        </div>
      </div>

      <section className="panel stack">
        <div>
          <p className="week-note" style={{ marginBottom: "0.35rem" }}>
            当前空间
          </p>
          <h2 className="brand" style={{ margin: 0, fontSize: "1.4rem" }}>
            {membership.space.name}
          </h2>
        </div>

        <div>
          <p className="week-note" style={{ marginBottom: "0.35rem" }}>
            邀请码（给另一半）
          </p>
          <p className="invite-code">{membership.space.inviteCode}</p>
          <div className="inline-actions" style={{ marginTop: "0.75rem" }}>
            <CopyInviteButton code={membership.space.inviteCode} />
            {canReset ? (
              <ActionForm
                action={resetInviteCodeAction}
                submitLabel="重置邀请码"
                submitClassName="btn btn-ghost"
              />
            ) : null}
          </div>
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
          <StatusSubmit label="退出登录" className="btn btn-primary btn-block" />
        </form>
      </section>

      <AppNav current="/settings" />
    </main>
  );
}
